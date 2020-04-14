function spy (impl) {
  const spyFn = function (...args) {
    spyFn.spy.calls.push(args)
    spyFn.spy.instances.push(this)
    try {
      const value = impl.apply(this, args)
      spyFn.spy.results.push({ type: 'return', value })
      return value
    } catch (err) {
      spyFn.spy.results.push({ type: 'throw', value: err })
      throw err
    }
  }
  spyFn.spy = {
    calls: [],
    instances: [],
    results: []
  }
  return spyFn
}

module.exports = spy
