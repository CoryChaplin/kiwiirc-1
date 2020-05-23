'kiwi public';

/**
 * batchedAdd prevents a flood of new inserts into state. After X inserts/sec, batch
 * each second worth of new items at the same time.
 */
export default function batchedAdd(singleFn, batchedFn, numInsertsSec = 3) {
    let queue = [];
    let numInLastSec = 0;
    let queueLoopTmr = null;
    let loopInterval = 1000;
    let checkSecRateTmr = null;

    function queueLoop() {
        numInLastSec = 0;
        if (queue.length) {
            // emptying queue before calling batchedFn in case that function triggers
            // code that needs to see that the queue has been processed.
            let q = queue;
            queue = [];
            batchedFn(q);
            queueLoopTmr = setTimeout(queueLoop, loopInterval);
        } else {
            queueLoopTmr = null;
        }
    }

    function maybeStartLoop() {
        if (!queueLoopTmr) {
            queueLoopTmr = setTimeout(queueLoop, loopInterval);
        }
    }

    // Reset numInLastSec after loopInterval. This allows enough time for the counter to
    // increase to detect batching. Only needs to run if we are not currently batching and
    // only needs to run once at a time.
    function resetAddCounter() {
        if (!queueLoopTmr && !checkSecRateTmr) {
            checkSecRateTmr = setTimeout(() => {
                checkSecRateTmr = null;
                if (!queueLoopTmr) {
                    numInLastSec = 0;
                }
            }, loopInterval);
        }
    }

    function batchFn(item) {
        numInLastSec++;

        // If already queuing or we reached our limit on items/sec, queue the item
        if (queue.length || numInLastSec > numInsertsSec) {
            queue.push(item);
            maybeStartLoop();
        } else {
            singleFn(item);
            resetAddCounter();
        }
    }
    batchFn.queue = function getQueue() {
        return queue;
    };

    return batchFn;
}
