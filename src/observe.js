import {isObject, isArray, isFunction} from './utils'

const ARRAY_METHODS = [
    'push',
    'pop',
    'shift',
    'unshift',
    'sort',
    'reverse',
    'splice'
]

class Observer {
    constructor(obj, keypath, callback) {
        this.obj = obj
        this.keypath = keypath
        this.callback = callback
        this.objectPath = []
        this.update = this.update.bind(this)

        this.tokenize()

        if(this.key && isObject(this.target = this.realize())) {
            this.observe(this.key, this.target, this.callback)
        }
    }

    tokenize() {
        this.tokens = this.keypath.split('.')
        this.key = this.tokens.pop()
    }

    observeMutations(obj, key) {
        if(!isArray(obj)) {
            return
        }
        ARRAY_METHODS.forEach((method) => {
            obj[method] = (...args) => {
                Array.prototype[method].apply(obj, args)
                if(obj.$callbacks[key]) {
                    obj.$callbacks[key].forEach((cb) => {
                        cb()
                    })
                }
            }
        })
    }

    realize() {
        let current = this.obj, unreached = false, prev
        this.tokens.forEach((token, index) => {
            if(isObject(current)) {
                if(typeof this.objectPath[index] !== 'undefined') {
                    if(current !== (prev = this.objectPath[index])) {
                        this.unobserve(token, prev, this.update)
                        this.observe(token, current, this.update)
                        this.objectPath[index] = current
                    }
                } else {
                    this.observe(token, current, this.update)
                    this.objectPath[index] = current
                }
                current = current[token]
            } else {
                if(unreached === false) {
                    unreached = index
                }

                if(prev = this.objectPath[index]) {
                    this.unobserve(token, prev, this.update)
                }
            }
        })

        if(unreached !== false) {
            this.objectPath.splice(unreached)
        }

        return current
    }

    update() {
        let next, oldValue
        if((next = this.realize()) !== this.target) {
            if(isObject(this.target)) {
                this.unobserve(this.key, this.target, this.callback)
            }

            if(isObject(next)) {
                this.observe(this.key, next, this.callback)
            }

            oldValue = this.value
            this.target = next
            if (isFunction(this.value) || this.value !== oldValue) {
                this.callback()
            }
        }
    }

    observe(key, target, callback) {
        target.$callbacks = target.$callbacks || {}
        target.$callbacks[key] = target.$callbacks[key] || []
        let desc = Object.getOwnPropertyDescriptor(target, key)

        if (!(desc && (desc.get || desc.set))) {
            let value = target[key]
            const observer = this
            Object.defineProperty(target, key, {
                get() {
                    return value
                },
                set(newValue) {
                    if(newValue !== value) {
                        value = newValue
                        if(target.$callbacks[key]) {
                            target.$callbacks[key].forEach((cb) => {
                                cb()
                            })
                        }
                        observer.observeMutations(target, key)
                    }
                }
            })
        }

        if(target.$callbacks[key].indexOf(callback) === -1) {
            target.$callbacks[key].push(callback)
        }
        this.observeMutations(target, key)
    }

    unobserve(key, target, callback) {
        if(key === undefined) {
            let obj
            this.tokens.forEach((token, index) => {
                if(obj = this.objectPath[index]) {
                    this.unobserve(token, obj, this.update)
                }
            })
            if(isObject(this.target)) {
                this.unobserve(this.key, this.target, this.callback)
            }
        } else {
            if(target.$callbacks && target.$callbacks[key]) {
                const index = target.$callbacks[key].indexOf(callback)
                if(index !== -1) {
                    target.$callbacks[key].splice(index, 1)
                }
            }
        }
    }

    get value() {
        if(isObject(this.target)) {
            return this.target[this.key]
        }
        
    }

    set value(newValue) {
        if(isObject(this.target)) {
            this.target[this.key] = newValue
        }     
    }
}

export default function observe(obj, keypath, callback) {
    return new Observer(obj, keypath, callback)
}