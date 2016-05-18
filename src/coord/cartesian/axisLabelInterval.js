/**
 * Helper function for axisLabelInterval calculation
 */

define(function(require) {
    'use strict';

    var zrUtil = require('zrender/core/util');
    var axisHelper = require('../axisHelper');

    return function (axis) {
        var axisModel = axis.model;
        var labelModel = axisModel.getModel('axisLabel');
        var labelInterval = labelModel.get('interval');
        if (!(axis.type === 'category' && labelInterval === 'auto')) {
            return labelInterval === 'auto' ? 0 : labelInterval;
        }

        //category类型默认会尽量显示全部label，不会按aplitNumber分割坐标轴labels。
        //labelInterval只有label数量超过40或文字互相覆盖时才不为0。
        //修改：
        //在没有指定labelInterval时，将splitNumber传入，帮助计算interval

        return axisHelper.getAxisLabelInterval(
            zrUtil.map(axis.scale.getTicks(), axis.dataToCoord, axis),
            axisModel.getFormattedLabels(),
            labelModel.getModel('textStyle').getFont(),
            axis.isHorizontal(),
            axisModel.get('splitNumber')
        );
    };
});