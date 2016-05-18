define(function (require) {

    var graphic = require('../../util/graphic');
    var zrUtil = require('zrender/core/util');

    /**
     * @param {module:echarts/model/Series} seriesModel
     * @param {boolean} hasAnimation
     * @inner
     */
    function updateDataSelected(uid, seriesModel, hasAnimation, api) {
        var data = seriesModel.getData();
        var dataIndex = this.dataIndex;
        var name = data.getName(dataIndex);
        var selectedOffset = seriesModel.get('selectedOffset');

        api.dispatchAction({
            type: 'pieToggleSelect',
            from: uid,
            name: name,
            seriesId: seriesModel.id,
            extra: {
                seriesIndex: seriesModel.seriesIndex,
                data: seriesModel.get('data'),
                dataIndex: data.getRawIndex(dataIndex),
                id: data.getId(dataIndex)
            }
        });

        data.each(function (idx) {
            toggleItemSelected(
                data.getItemGraphicEl(idx),
                data.getItemLayout(idx),
                seriesModel.isSelected(data.getName(idx)),
                selectedOffset,
                hasAnimation
            );
        });
    }

    /**
     * @param {module:zrender/graphic/Sector} el
     * @param {Object} layout
     * @param {boolean} isSelected
     * @param {number} selectedOffset
     * @param {boolean} hasAnimation
     * @inner
     */
    function toggleItemSelected(el, layout, isSelected, selectedOffset, hasAnimation) {
        var midAngle = (layout.startAngle + layout.endAngle) / 2;

        var dx = Math.cos(midAngle);
        var dy = Math.sin(midAngle);

        var offset = isSelected ? selectedOffset : 0;
        var position = [dx * offset, dy * offset];

        hasAnimation
            // animateTo will stop revious animation like update transition
            ? el.animate()
                .when(200, {
                    position: position
                })
                .start('bounceOut')
            : el.attr('position', position);
    }

    /**
     * Piece of pie including Sector, Label, LabelLine
     * @constructor
     * @extends {module:zrender/graphic/Group}
     */
    function PiePiece(data, idx) {

        graphic.Group.call(this);

        var sector = new graphic.Sector({
            z2: 2
        });
        var polyline = new graphic.Polyline();
        var text = new graphic.Text();
        this.add(sector);
        this.add(polyline);
        this.add(text);

        // 自定义label环绕文字的圆角矩形
        var rect = new graphic.Rect();
        // 标签右边的按钮图标
        var img = new graphic.Image();
        // 一个透明的矩形，改在标签上面，防止点击时展开圆环
        var rectCover = new graphic.Rect();

        this.add(rect);
        this.add(img);
        this.add(rectCover);

        this.updateData(data, idx, true);

        // Hover to change label and labelLine
        function onEmphasis() {
            polyline.ignore = polyline.hoverIgnore;
            text.ignore = text.hoverIgnore;
            // 圆角矩形、和按钮图标的忽略状态
            rect.ignore = rect.hoverIgnore;
            img.ignore = img.hoverIgnore;
            // rectCover的状态跟随rect
            rectCover.ignore = rect.hoverIgnore;

            var textRect = text.getBoundingRect();
            var textW = textRect.width;
            // 如果rect和img都不忽略，rect宽度加宽
            if (!(rect.ignore || img.ignore)) {
                rect.animateTo({
                    shape: {
                        width: textW + 40
                    }
                }, 300, 'elasticOut');
                rectCover.animateTo({
                    shape: {
                        width: textW + 40
                    }
                }, 300, 'elasticOut');
            }
        }
        function onNormal() {
            polyline.ignore = polyline.normalIgnore;
            text.ignore = text.normalIgnore;
            // 圆角矩形、和按钮图标的忽略状态
            rect.ignore = rect.normalIgnore;
            img.ignore = img.normalIgnore;
            // rectCover的状态跟随rect
            rectCover.ignore = rect.normalIgnore;

            var textRect = text.getBoundingRect();
            var textW = textRect.width;
            // 如果rect不忽略，img忽略，rect宽度回到正常宽度
            if (!rect.ignore && img.ignore) {
                rect.animateTo({
                    shape: {
                        width: textW + 20
                    }
                }, 300, 'elasticOut');
                rectCover.animateTo({
                    shape: {
                        width: textW + 20
                    }
                }, 300, 'elasticOut');
            }
        }
        this.on('emphasis', onEmphasis)
            .on('normal', onNormal)
            .on('mouseover', onEmphasis)
            .on('mouseout', onNormal);
    }

    var piePieceProto = PiePiece.prototype;

    function getLabelStyle(data, idx, state, labelModel, labelPosition) {
        var textStyleModel = labelModel.getModel('textStyle');
        var isLabelInside = labelPosition === 'inside' || labelPosition === 'inner';
        return {
            fill: textStyleModel.getTextColor()
                || (isLabelInside ? '#fff' : data.getItemVisual(idx, 'color')),
            textFont: textStyleModel.getFont(),
            text: zrUtil.retrieve(
                data.hostModel.getFormattedLabel(idx, state), data.getName(idx)
            )
        };
    }

    piePieceProto.updateData = function (data, idx, firstCreate) {

        var sector = this.childAt(0);

        var seriesModel = data.hostModel;
        var itemModel = data.getItemModel(idx);
        var layout = data.getItemLayout(idx);
        var sectorShape = zrUtil.extend({}, layout);
        sectorShape.label = null;
        if (firstCreate) {
            sector.setShape(sectorShape);
            sector.shape.endAngle = layout.startAngle;
            graphic.updateProps(sector, {
                shape: {
                    endAngle: layout.endAngle
                }
            }, seriesModel);
        }
        else {
            graphic.updateProps(sector, {
                shape: sectorShape
            }, seriesModel);
        }

        // Update common style
        var itemStyleModel = itemModel.getModel('itemStyle');
        var visualColor = data.getItemVisual(idx, 'color');

        sector.setStyle(
            zrUtil.defaults(
                {
                    fill: visualColor
                },
                itemStyleModel.getModel('normal').getItemStyle()
            )
        );
        sector.hoverStyle = itemStyleModel.getModel('emphasis').getItemStyle();

        // Toggle selected
        toggleItemSelected(
            this,
            data.getItemLayout(idx),
            itemModel.get('selected'),
            seriesModel.get('selectedOffset'),
            seriesModel.get('animation')
        );

        function onEmphasis() {
            // Sector may has animation of updating data. Force to move to the last frame
            // Or it may stopped on the wrong shape
            sector.stopAnimation(true);
            sector.animateTo({
                shape: {
                    r: layout.r + 10
                }
            }, 300, 'elasticOut');
        }
        function onNormal() {
            sector.stopAnimation(true);
            sector.animateTo({
                shape: {
                    r: layout.r
                }
            }, 300, 'elasticOut');
        }
        sector.off('mouseover').off('mouseout').off('emphasis').off('normal');
        if (itemModel.get('hoverAnimation')) {
            sector
                .on('mouseover', onEmphasis)
                .on('mouseout', onNormal)
                .on('emphasis', onEmphasis)
                .on('normal', onNormal);
        }

        this._updateLabel(data, idx);

        graphic.setHoverStyle(this);
    };

    piePieceProto._updateLabel = function (data, idx) {

        var labelLine = this.childAt(1);
        var labelText = this.childAt(2);

        // 圆角矩形和按钮
        var labelRect = this.childAt(3);
        var labelImg = this.childAt(4);
        // 标签的透明覆盖矩形，状态跟随labelRect
        var labelRectCover = this.childAt(5);

        var seriesModel = data.hostModel;
        var itemModel = data.getItemModel(idx);
        var layout = data.getItemLayout(idx);
        var labelLayout = layout.label;
        var visualColor = data.getItemVisual(idx, 'color');

        graphic.updateProps(labelLine, {
            shape: {
                points: labelLayout.linePoints || [
                    [labelLayout.x, labelLayout.y], [labelLayout.x, labelLayout.y], [labelLayout.x, labelLayout.y]
                ]
            }
        }, seriesModel);

        graphic.updateProps(labelText, {
            style: {
                x: labelLayout.x,
                y: labelLayout.y
            }
        }, seriesModel);

        labelText.attr({
            style: {
                textVerticalAlign: labelLayout.verticalAlign,
                textAlign: labelLayout.textAlign,
                textFont: labelLayout.font
            },
            rotation: labelLayout.rotation,
            origin: [labelLayout.x, labelLayout.y],
            z2: 20
        });

        var labelModel = itemModel.getModel('label.normal');
        var labelHoverModel = itemModel.getModel('label.emphasis');
        var labelLineModel = itemModel.getModel('labelLine.normal');
        var labelLineHoverModel = itemModel.getModel('labelLine.emphasis');
        var labelPosition = labelModel.get('position') || labelHoverModel.get('position');

        labelText.setStyle(getLabelStyle(data, idx, 'normal', labelModel, labelPosition));

        // labelText设置标签文本之后，获取文本的尺寸，添加方框
        var textRect = labelText.getBoundingRect();
        var textW = textRect.width;

        graphic.updateProps(labelRect, {
            shape: {
                r: [10],
                x: labelLayout.x - textW/2 - 10,
                y: labelLayout.y - 9,
                width: !labelLayout.addBtn || (labelLayout.addBtn && labelLayout.addBtnHover) ? textW+20 : textW+40,
                height: 20
            },
            z2: 10
        }, seriesModel);

        graphic.updateProps(labelRectCover, {
            shape: {
                r: [10],
                x: labelLayout.x - textW/2 - 10,
                y: labelLayout.y - 9,
                width: !labelLayout.addBtn || (labelLayout.addBtn && labelLayout.addBtnHover) ? textW+20 : textW+40,
                height: 20
            },
            z2: 25
        }, seriesModel);

        if (labelLayout.addBtn) {
            graphic.updateProps(labelImg, {
                style: {
                    image: labelLayout.addBtnImg,
                    x: labelLayout.x + textW/2 + 10,
                    y: labelLayout.y - 7,
                    width: 18,
                    height: 18
                },
                z2: 15
            }, seriesModel)
        }

        labelText.ignore = labelText.normalIgnore = !labelModel.get('show');
        labelText.hoverIgnore = !labelHoverModel.get('show');

        labelLine.ignore = labelLine.normalIgnore = !labelLineModel.get('show');
        labelLine.hoverIgnore = !labelLineHoverModel.get('show');

        // 圆角矩形和按钮
        labelRect.ignore = labelRect.normalIgnore = ((labelPosition == 'circle-center' || labelPosition == 'btn-center') && labelModel.get('show')) ? false : true;
        // labelRect.ignore = labelRect.normalIgnore;
        labelRect.hoverIgnore = ((labelPosition == 'circle-center' || labelPosition == 'btn-center') && labelModel.get('show')) ? false : true;
        labelRectCover.ignore = labelRect.normalIgnore;
        labelRectCover.hoverIgnore = labelRect.hoverIgnore;
        
        labelImg.ignore = labelImg.normalIgnore = (!labelLayout.addBtn) || (labelLayout.addBtn && labelLayout.addBtnHover);
        // labelImg.hoverIgnore = labelRect.hoverIgnore || ((!labelLayout.addBtn) || (labelLayout.addBtn && (!labelLayout.addBtnHover)));
        labelImg.hoverIgnore = (!labelLayout.addBtn) || labelRect.hoverIgnore;

        // Default use item visual color
        labelLine.setStyle({
            stroke: visualColor
        });

        var rectColor = 'rgba(255,0,0,0.3)';
        if (labelLayout.addBtnColor) {
            rectColor = labelLayout.addBtnColor;
        }
        // rectCover全透明
        labelRectCover.setStyle({
            fill: 'rgba(0,0,0,0)'
        });
        labelRect.setStyle({
            fill: rectColor
        });

        labelLine.setStyle(labelLineModel.getModel('lineStyle').getLineStyle());

        labelText.hoverStyle = getLabelStyle(data, idx, 'emphasis', labelHoverModel, labelPosition);
        labelLine.hoverStyle = labelLineHoverModel.getModel('lineStyle').getLineStyle();

        var smooth = labelLineModel.get('smooth');
        if (smooth && smooth === true) {
            smooth = 0.4;
        }
        labelLine.setShape({
            smooth: smooth
        });
    };

    zrUtil.inherits(PiePiece, graphic.Group);


    // Pie view
    var Pie = require('../../view/Chart').extend({

        type: 'pie',

        init: function () {
            var sectorGroup = new graphic.Group();
            this._sectorGroup = sectorGroup;
        },

        render: function (seriesModel, ecModel, api, payload) {
            if (payload && (payload.from === this.uid)) {
                return;
            }

            var data = seriesModel.getData();
            var oldData = this._data;
            var group = this.group;

            var hasAnimation = ecModel.get('animation');
            var isFirstRender = !oldData;

            var onSectorClick = zrUtil.curry(
                updateDataSelected, this.uid, seriesModel, hasAnimation, api
            );
            var shapeClick = function (event) {
                if (event.target.type != 'rect') {
                    onSectorClick.call(this, event);
                }
            };

            var selectedMode = seriesModel.get('selectedMode');

            data.diff(oldData)
                .add(function (idx) {
                    var piePiece = new PiePiece(data, idx);
                    if (isFirstRender) {
                        piePiece.eachChild(function (child) {
                            child.stopAnimation(true);
                        });
                    }

                    selectedMode && piePiece.on('click', shapeClick);

                    data.setItemGraphicEl(idx, piePiece);

                    group.add(piePiece);
                })
                .update(function (newIdx, oldIdx) {
                    var piePiece = oldData.getItemGraphicEl(oldIdx);

                    piePiece.updateData(data, newIdx);

                    piePiece.off('click');
                    selectedMode && piePiece.on('click', shapeClick);
                    group.add(piePiece);
                    data.setItemGraphicEl(newIdx, piePiece);
                })
                .remove(function (idx) {
                    var piePiece = oldData.getItemGraphicEl(idx);
                    group.remove(piePiece);
                })
                .execute();

            if (hasAnimation && isFirstRender && data.count() > 0) {
                var shape = data.getItemLayout(0);
                var r = Math.max(api.getWidth(), api.getHeight()) / 2;

                var removeClipPath = zrUtil.bind(group.removeClipPath, group);
                group.setClipPath(this._createClipPath(
                    shape.cx, shape.cy, r, shape.startAngle, shape.clockwise, removeClipPath, seriesModel
                ));
            }

            this._data = data;
        },

        _createClipPath: function (
            cx, cy, r, startAngle, clockwise, cb, seriesModel
        ) {
            var clipPath = new graphic.Sector({
                shape: {
                    cx: cx,
                    cy: cy,
                    r0: 0,
                    r: r,
                    startAngle: startAngle,
                    endAngle: startAngle,
                    clockwise: clockwise
                }
            });

            graphic.initProps(clipPath, {
                shape: {
                    endAngle: startAngle + (clockwise ? 1 : -1) * Math.PI * 2
                }
            }, seriesModel, cb);

            return clipPath;
        }
    });

    return Pie;
});