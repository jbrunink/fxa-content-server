/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

'use strict';

const amplitude = require('../amplitude');
const flowMetrics = require('../flow-metrics');
const { logFlowEvent } = require('../flow-event');
const uuid = require('node-uuid');

module.exports = function (config) {
  const FLOW_ID_KEY = config.get('flow_id_key');
  const FLOW_EVENT_NAME = 'flow.begin';
  const UPDATE_FIREFOX_SCREEN_EVENT_NAME = 'screen.update-firefox';
  const UPDATE_FIREFOX_FLOW_EVENT_NAME = 'flow.update-firefox.view';

  return {
    method: 'get',
    path: '/update_firefox',
    process: function (req, res) {
      const flowEventData = flowMetrics.create(FLOW_ID_KEY, req.headers['user-agent']);
      const flowBeginTime = flowEventData.flowBeginTime;
      const flowId = flowEventData.flowId;
      const metricsData = req.query || {};
      const beginEvent = {
        flowTime: flowBeginTime,
        time: flowBeginTime,
        type: FLOW_EVENT_NAME
      };

      metricsData.flowId = flowId;
      // Amplitude-specific device id, like the client-side equivalent
      // created in app/scripts/lib/app-start.js. Transient for now,
      // but will become persistent in due course.
      metricsData.deviceId = uuid.v4().replace(/-/g, '');

      amplitude(beginEvent, req, metricsData);
      logFlowEvent(beginEvent, metricsData, req);

      amplitude({
        flowTime: flowBeginTime,
        time: flowBeginTime,
        type: UPDATE_FIREFOX_SCREEN_EVENT_NAME
      }, req, metricsData);
      logFlowEvent({
        flowTime: flowBeginTime,
        time: flowBeginTime,
        type: UPDATE_FIREFOX_FLOW_EVENT_NAME
      }, metricsData, req);

      res.render('update_firefox');
    }
  };
};
