import { EventEmitter } from 'events';

class PromiseEventEmitter extends EventEmitter {
    constructor() {
        super();
        // Keep track of listeners that return promises
        this.promiseListeners = new Map();
    }

    // Override emit to handle promises
    async emitAsync(eventName, ...args) {
        // Get all listeners for this event
        const listeners = this.listeners(eventName);
        
        // Execute all listeners and collect their promises
        const promises = listeners.map(listener => {
            try {
                const result = listener(...args);
                return result instanceof Promise ? result : Promise.resolve(result);
            } catch (error) {
                return Promise.reject(error);
            }
        });

        // Wait for all promises to resolve
        return Promise.all(promises);
    }
}

const eventBus = new PromiseEventEmitter();

export default eventBus;
