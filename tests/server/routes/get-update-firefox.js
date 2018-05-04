/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
const { registerSuite } = intern.getInterface('object');
const assert = intern.getPlugin('chai').assert;
const sinon = require('sinon');
const proxyquire = require('proxyquire');

let instance;
let mocks;
let request;
let response;
let route;

registerSuite('routes/get-update-firefox', {
  before: function () {

    mocks = {
      amplitude: sinon.spy(),
      config: {
        get (key) {
          switch (key) {
          case 'flow_id_key':
            return 'foo';
          case 'flow_id_expiry':
            return 7200000;
          }
        }
      },
      flowEvent: {
        logFlowEvent: sinon.spy()
      },
    };

    route = proxyquire('../../../server/lib/routes/get-update-firefox', {
      '../amplitude': mocks.amplitude,
      '../flow-event': mocks.flowEvent,
    });
  },

  'route interface is correct': function () {
    assert.isFunction(route);
    assert.lengthOf(route, 1);
  },

  tests: {
    'initialise route': {
      before: function () {
        instance = route(mocks.config);
      },

      tests: {
        'instance interface is correct': function () {
          assert.isObject(instance);
          assert.lengthOf(Object.keys(instance), 3);
          assert.equal(instance.method, 'get');
          assert.equal(instance.path, '/update_firefox');
          assert.isFunction(instance.process);
          assert.lengthOf(instance.process, 2);
        },

        'route.process': {
          before: function () {
            request = {
              headers: {},
            };
            response = {render: sinon.spy()};
            instance.process(request, response);
          },

          tests: {
            'response.render was called correctly': function () {
              assert.isTrue(response.render.calledOnceWith('update_firefox'));
            },

            'logs begin amplitude and flow events': function () {
              assert.equal(mocks.amplitude.callCount, 2);
              assert.equal(mocks.flowEvent.logFlowEvent.callCount, 2);

              let args = mocks.amplitude.args[0];
              assert.equal(args.length, 3);
              assert.ok(args[0].flowTime);
              assert.ok(args[0].time);
              assert.equal(args[0].type, 'flow.begin');
              assert.ok(args[2].flowId);
              assert.ok(args[2].deviceId);
              assert.notEqual(args[2].deviceId, args[2].flowId);

              args = mocks.flowEvent.logFlowEvent.args[0];
              const eventData = args[0];
              const metricsData = args[1];
              assert.ok(eventData.flowTime);
              assert.ok(eventData.time);
              assert.equal(eventData.type, 'flow.begin');
              assert.ok(metricsData.flowId);
              assert.ok(metricsData.deviceId);
            },

            'logs update-firefox.view amplitude and flow events': function () {
              let args = mocks.amplitude.args[1];
              assert.equal(args.length, 3);
              assert.ok(args[0].flowTime);
              assert.ok(args[0].time);
              assert.equal(args[0].type, 'screen.update-firefox');
              assert.ok(args[2].flowId);

              args = mocks.flowEvent.logFlowEvent.args[1];
              const eventData = args[0];
              const metricsData = args[1];
              assert.ok(eventData.flowTime);
              assert.ok(eventData.time);
              assert.equal(eventData.type, 'flow.update-firefox.view');
              assert.ok(metricsData.flowId);
            },
          }
        }
      }
    }
  }
});
