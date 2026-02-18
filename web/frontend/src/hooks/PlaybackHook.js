import { useState, useRef, useEffect, useCallback } from 'react';

// Constants
const DELETION_WAIT_DURATION = 300; // ms
const TIME_SKIP_THRESHOLD = 60 * 60 * 1000; // 1 hour
const TIME_SKIP_DISPLAY_DURATION = 1000; // ms

/**
 * usePlaybackEngine Hook
 *
 * Manages the interpolation and playback of revision history deltas.
 *
 * @param {Object} deltaManifest - The manifest containing baseText and deltas.
 */
export function usePlaybackEngine(deltaManifest) {
    const [currentText, setCurrentText] = useState('');
    const [currentRevisionIndex, setCurrentRevisionIndex] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [pendingDeletions, setPendingDeletions] = useState([]);
    const [isTimeSkipping, setIsTimeSkipping] = useState(false);

    const stateRef = useRef({
        text: '',
        revisionIndex: 0,
        actionQueue: [],
        pendingDeletions: [], // Array of { start, length, text, expiry }
        isPlaying: false,
        lastFrameTime: 0,
        animationFrameId: null,
        manifest: null,
        timeSkipEndTime: 0,
        charDuration: 20, // Default 20ms per char
        timeAccumulator: 0
    });

    // Initialize
    useEffect(() => {
        if (deltaManifest) {
            stateRef.current.text = deltaManifest.baseText || '';
            stateRef.current.revisionIndex = 0;
            stateRef.current.actionQueue = [];
            stateRef.current.pendingDeletions = [];
            stateRef.current.manifest = deltaManifest;
            stateRef.current.timeSkipEndTime = 0;

            setCurrentText(deltaManifest.baseText || '');
            setCurrentRevisionIndex(0);
            setPendingDeletions([]);
            setIsTimeSkipping(false);
        }
    }, [deltaManifest]);

    const gameLoop = useCallback((timestamp) => {
        if (!stateRef.current.isPlaying) return;
        const manifest = stateRef.current.manifest;
        if (!manifest) return;

        if (!stateRef.current.lastFrameTime) stateRef.current.lastFrameTime = timestamp;
        const deltaTime = timestamp - stateRef.current.lastFrameTime;
        stateRef.current.lastFrameTime = timestamp;

        // 1. Handle Time Skip Wait
        if (stateRef.current.timeSkipEndTime > 0) {
            if (timestamp < stateRef.current.timeSkipEndTime) {
                // Still waiting
                stateRef.current.animationFrameId = requestAnimationFrame(gameLoop);
                return;
            } else {
                // Done waiting
                stateRef.current.timeSkipEndTime = 0;
                setIsTimeSkipping(false);
            }
        }

        // 2. Handle Deletion Expiry
        const expiredIndices = [];
        stateRef.current.pendingDeletions.forEach((d, i) => {
            if (timestamp >= d.expiry) {
                expiredIndices.push(i);
            }
        });

        if (expiredIndices.length > 0) {
            // Process from end to start to avoid index shift issues within this batch
            expiredIndices.sort((a, b) => b - a);

            expiredIndices.forEach(idx => {
                const d = stateRef.current.pendingDeletions[idx];
                // Remove from text
                const txt = stateRef.current.text;
                const pre = txt.slice(0, d.start);
                const post = txt.slice(d.start + d.length);
                stateRef.current.text = pre + post;

                // Shift remaining deletions that start after this one
                // Note: We are iterating over the LIVE pendingDeletions array for updates
                stateRef.current.pendingDeletions.forEach((other, oIdx) => {
                    // Only shift deletions that are visibly AFTER the deleted range
                    if (oIdx !== idx && other.start > d.start) {
                        other.start -= d.length;
                    }
                });

                // Remove from pending
                stateRef.current.pendingDeletions.splice(idx, 1);
            });

            setCurrentText(stateRef.current.text);
            setPendingDeletions([...stateRef.current.pendingDeletions]);
        }

        // 3. Load Next Revision if Queue Empty
        if (stateRef.current.actionQueue.length === 0) {
            const nextIndex = stateRef.current.revisionIndex;
            if (nextIndex < manifest.deltas.length) {
                const delta = manifest.deltas[nextIndex];

                // Check Time Skip
                if (nextIndex > 0) {
                    const prevTimestamp = new Date(manifest.deltas[nextIndex - 1].timestamp).getTime();
                    const currTimestamp = new Date(delta.timestamp).getTime();
                    if (currTimestamp - prevTimestamp > TIME_SKIP_THRESHOLD) {
                        stateRef.current.timeSkipEndTime = timestamp + TIME_SKIP_DISPLAY_DURATION;
                        setIsTimeSkipping(true);
                        stateRef.current.animationFrameId = requestAnimationFrame(gameLoop);
                        return;
                    }
                }

                // Parse Ops
                const ops = delta.ops;
                const actions = [];
                let cursor = 0; // logical cursor

                // Estimate char duration (simple logic: 20ms per char)
                stateRef.current.charDuration = 20;
                stateRef.current.timeAccumulator = 0;

                // Generate Actions
                for (const [op, text] of ops) {
                    if (op === 0) { // Equal
                        cursor += text.length;
                    } else if (op === 1) { // Insert
                        for (const char of text) {
                            actions.push({ type: 'insert', char, logicalIndex: cursor });
                            cursor++;
                        }
                    } else if (op === -1) { // Delete
                         actions.push({ type: 'delete', text, logicalIndex: cursor });
                         // cursor doesn't move for delete in logical space relative to original source
                    }
                }
                stateRef.current.actionQueue = actions;
                stateRef.current.revisionIndex++;
            } else {
                 setIsPlaying(false);
                 stateRef.current.isPlaying = false;
                 return;
            }
        }

        // 4. Process Actions
        stateRef.current.timeAccumulator += deltaTime;

        while (stateRef.current.actionQueue.length > 0 &&
               stateRef.current.timeAccumulator >= stateRef.current.charDuration) {

            stateRef.current.timeAccumulator -= stateRef.current.charDuration;
            const action = stateRef.current.actionQueue.shift();

            let visualIndex = action.logicalIndex;
            // Adjust visualIndex based on pending deletions
            const sortedPending = [...stateRef.current.pendingDeletions].sort((a,b) => a.start - b.start);

            for (const d of sortedPending) {
                if (d.start <= visualIndex) {
                     visualIndex += d.length;
                }
            }

            const txt = stateRef.current.text;

            if (action.type === 'insert') {
                const pre = txt.slice(0, visualIndex);
                const post = txt.slice(visualIndex);
                stateRef.current.text = pre + action.char + post;

                // Shift pending deletions after insertion point
                stateRef.current.pendingDeletions.forEach(d => {
                    if (d.start >= visualIndex) {
                        d.start += 1;
                    }
                });

            } else if (action.type === 'delete') {
                // Add to pending
                stateRef.current.pendingDeletions.push({
                    start: visualIndex,
                    length: action.text.length,
                    text: action.text,
                    expiry: timestamp + DELETION_WAIT_DURATION
                });
            }

            // Update React state
            setCurrentText(stateRef.current.text);
            setPendingDeletions([...stateRef.current.pendingDeletions]);
        }

        if (stateRef.current.isPlaying) {
            setCurrentRevisionIndex(stateRef.current.revisionIndex);
            stateRef.current.animationFrameId = requestAnimationFrame(gameLoop);
        }
    }, []);

    // Handle Play/Pause toggle
    useEffect(() => {
        if (isPlaying && !stateRef.current.isPlaying) {
            stateRef.current.isPlaying = true;
            stateRef.current.lastFrameTime = performance.now();
            stateRef.current.animationFrameId = requestAnimationFrame(gameLoop);
        } else if (!isPlaying && stateRef.current.isPlaying) {
            stateRef.current.isPlaying = false;
            if (stateRef.current.animationFrameId) {
                cancelAnimationFrame(stateRef.current.animationFrameId);
            }
        }
    }, [isPlaying, gameLoop]);

    return {
        currentText,
        currentRevisionIndex,
        isPlaying,
        pendingDeletions,
        isTimeSkipping,
        play: () => setIsPlaying(true),
        pause: () => setIsPlaying(false),
        setIndex: (index) => console.warn("Seeking not implemented")
    };
}
