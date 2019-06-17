// (function () {
//     var Ext = window.Ext4 || window.Ext;

Ext.define('CustomAgile.apps.PortfolioItemTimeline.app', {
    extend: 'Rally.app.TimeboxScopedApp',
    settingsScope: 'project',
    componentCls: 'app',
    config: {
        tlAfter: 90,  //Half a year approx
        tlBack: 120, //How many days before today.
        defaultSettings: {
            includeAncestor: true,
            showTimeLine: true,
            showReleases: true,
            hideArchived: true,
            showFilter: true,
            //onlyDependencies: false,
            // startDate: Ext.Date.subtract(new Date(), Ext.Date.DAY, 90),
            // endDate: Ext.Date.add(new Date(), Ext.Date.DAY, 60),
            lineSize: 40,
            //lowestDependencies: true,
            cardHover: true
        }
    },

    colours: ['#f2f0f7', '#dadaeb', '#bcbddc', '#9e9ac8', '#756bb1', '#54278f'],

    getSettingsFields: function () {
        var returned = [
            {
                name: 'includeAncestor',
                xtype: 'rallycheckboxfield',
                fieldLabel: 'Include ancestor in timeline',
                labelAlign: 'top'
            },
            {
                name: 'showTimeLine',
                xtype: 'rallycheckboxfield',
                fieldLabel: 'Show dates at top',
                labelAlign: 'top'
            },
            {
                name: 'showReleases',
                xtype: 'rallycheckboxfield',
                fieldLabel: 'Show Releases at top',
                labelAlign: 'top'
            },
            {
                name: 'hideArchived',
                xtype: 'rallycheckboxfield',
                fieldLabel: 'Hide Archived',
                labelAlign: 'top'
            },
            {
                xtype: 'rallycheckboxfield',
                fieldLabel: 'Show Advanced filter',
                name: 'showFilter',
                labelAlign: 'top'
            },
            // {
            //     xtype: 'rallycheckboxfield',
            //     fieldLabel: 'Only items with dependencies',
            //     name: 'onlyDependencies',
            //     labelAlign: 'top'
            // },
            // {
            //     xtype: 'rallycheckboxfield',
            //     fieldLabel: 'Only Feature dependencies',
            //     name: 'lowestDependencies',
            //     labelAlign: 'top'
            // },
            {
                xtype: 'rallycheckboxfield',
                fieldLabel: 'Allow card pop-up on hover',
                name: 'cardHover',
                labelAlign: 'top'
            },
            {
                xtype: 'rallynumberfield',
                fieldLabel: 'Grid bar width',
                name: 'lineSize',
                minValue: 15,
                labelAlign: 'top'
            }

        ];
        return returned;
    },
    _changedItems: [],

    itemId: 'rallyApp',
    MIN_COLUMN_WIDTH: 200,        //Looks silly on less than this
    LOAD_STORE_MAX_RECORDS: 100, //Can blow up the Rally.data.wsapi.filter.Or
    WARN_STORE_MAX_RECORDS: 300, //Can be slow if you fetch too many
    _rowHeight: 40,               //Leave space for "World view" text
    STORE_FETCH_FIELD_LIST:
        [
            'Name',
            'FormattedID',
            'PlannedStartDate',
            'PlannedEndDate',
            'ActualStartDate',
            'ActualEndDate',
            'Parent',
            'Children',
            'ObjectID',
            'Project',
            'DisplayName',
            'Owner',
            'PercentDoneByStoryCount',
            'PercentDoneByStoryPlanEstimate',
            'PredecessorsAndSuccessors',
            'State',
            'Value',
            'PreliminaryEstimate',
            'Predecessors',
            'Successors',
            'OrderIndex',   //Used to get the State field order index
            'PortfolioItemType',
            'Ordinal',
            'Release',
            'Iteration',
            'Milestones'
            //Customer specific after here. Delete as appropriate
            // 'c_ProjectIDOBN',
            // 'c_QRWP',
            // 'c_ProgressUpdate',
            // 'c_RAIDSeverityCriticality',
            // 'c_RISKProbabilityLevel',
            // 'c_RAIDRequestStatus'   
        ],
    CARD_DISPLAY_FIELD_LIST:
        [
            'Name',
            'Owner',
            'PreliminaryEstimate',
            'Parent',
            'Project',
            'PercentDoneByStoryCount',
            'PercentDoneByStoryPlanEstimate',
            'PlannedStartDate',
            'PlannedEndDate',
            'ActualStartDate',
            'ActualEndDate',
            'State'
            //Customer specific after here. Delete as appropriate
            // 'c_ProjectIDOBN',
            // 'c_QRWP'

        ],

    items: [
        {
            id: Utils.AncestorPiAppFilter.RENDER_AREA_ID,
            xtype: 'container',
            flex: 1,
            layout: {
                type: 'hbox',
                align: 'middle',
                defaultMargins: '0 15 10 0',
            }
        },
        {
            itemId: 'additionalSettingsArea',
            xtype: 'container',
            flex: 1,
            layout: {
                type: 'hbox',
                align: 'middle',
                defaultMargins: '0 10 10 0',
            }
        },
        {
            xtype: 'container',
            itemId: 'filterBox',
        },
        {
            xtype: 'container',
            itemId: 'rootSurface',
            id: 'rootSurface',
            padding: '5 0 5 0',
            layout: 'auto',
            width: '98%',
            title: 'Loading...',
            autoEl: { tag: 'svg' },
            listeners: { afterrender: function () { gApp = this.up('#rallyApp'); }, },
            visible: false
        }
    ],

    //Set the SVG area to the surface we have provided
    // _setSVGSize: function (surface) {
    //     var svg = d3.select('#rootSurface');
    //     svg.attr('width', surface.getEl().dom.clientWidth);
    //     svg.attr('height', surface.getEl().dom.clientHeight);
    // },
    _nodeTree: null,

    //Continuation point after selectors ready/changed
    _redrawNodeTree: function () {
        if (gApp._nodes.length === 0) { return; }
        gApp._rowHeight = gApp.getSetting('lineSize') || 40;

        //Get all the nodes and the "Unknown" parent virtual nodes
        var nodetree = gApp._createNodeTree(gApp._nodes);
        if (!nodetree) { return; }

        var svg = d3.select('#rootSurface');
        svg.attr('height', gApp._rowHeight * (nodetree.value + (gApp.getSetting('showTimeLine') ? 1 : 0) + (gApp.getSetting('showReleases') ? 1 : 0)));
        //Make surface the size available in the viewport (minus the selectors and margins)
        var rs = gApp.down('#rootSurface');
        rs.getEl().setHeight(svg.attr('height'));
        svg.attr('width', rs.getEl().getWidth());
        svg.attr('class', 'rootSurface');
        gApp._startTreeAgain();
    },

    _switchChildren: function (d) {
        d.children ? gApp._collapse(d) : gApp._expand(d);
        gApp._zoomedStart();
    },

    _collapse: function (d) {
        if (d.children) {
            d._children = d.children;
            d.children = null;
            d._value = d.value;
            d.value = 1;
        }
    },

    _expand: function (d) {
        if (d._children) {
            d.children = d._children;
            d._children = null;
            d.value = d._value;
            d._value = 1;
        }
    },

    _collapseAll: function () {
        d3.selectAll('.collapse-icon').dispatch('collapseAll');
        gApp._zoomedStart();
    },

    _expandAll: function () {
        gApp.setLoading(true);
        for (let i = 0; i < 4; i++) {
            d3.selectAll('.collapse-icon').dispatch('expandAll');
            gApp._zoomedStart();
        }
        gApp.setLoading(false);
    },

    _initialiseScale: function () {
        var timebegin = new Date(Ext.Date.subtract(new Date(), Ext.Date.DAY, gApp.tlBack));
        var timeend = new Date(Ext.Date.add(new Date(), Ext.Date.DAY, gApp.tlAfter));

        // If ancestor has planned dates, set axis to them
        if (gApp._nodes && gApp._nodes.length) {
            var start = gApp._nodes[0].record.get('PlannedStartDate');
            var end = gApp._nodes[0].record.get('PlannedEndDate');

            if (start) {
                timebegin = start;
                if (!end) {
                    timeend = Ext.Date.add(timebegin, Ext.Date.DAY, 180);
                }
            }
            if (end) {
                timeend = end;
                if (!start) {
                    timebegin = Ext.Date.subtract(timebegin, Ext.Date.DAY, 180);
                }
            }
        }
        gApp.down('#axisStartDate').setValue(timebegin);
        gApp.down('#axisEndDate').setValue(timeend);
        gApp._setTimeScaler(timebegin, timeend);
    },

    _setTimeScaler: function (timebegin, timeend) {
        gApp.dateScaler = d3.scaleTime()
            .domain([timebegin, timeend])
            .range([0, parseInt(d3.select('#rootSurface').attr('width')) - (gApp._rowHeight + 10)]);
    },

    _setAxis: function () {
        if (gApp.gX) { gApp.gX.remove(); }
        var svg = d3.select('#rootSurface');
        var width = +svg.attr('width');
        var height = +svg.attr('height');
        gApp.xAxis = d3.axisBottom(gApp.dateScaler)
            .ticks(((width - gApp._rowHeight) + 2) / 80)
            .tickSize(height)
            .tickPadding(gApp.getSetting('showTimeLine') ? (8 - height) : 0);
        gApp.gX = svg.append('g');
        gApp.gX.attr('transform', 'translate(' + gApp._rowHeight + ',0)')
            .attr('id', 'axisBox')
            .attr('width', width - (gApp._rowHeight + 10))
            .attr('height', height)
            .attr('class', 'axis')
            .call(gApp.xAxis);
        d3.selectAll('.tick line').attr('y1', 20);
        gApp.gX.append('line')
            .attr('x1', function () { return gApp.dateScaler(new Date()); })
            .attr('y1', 20)
            .attr('x2', function () { return gApp.dateScaler(new Date()); })
            .attr('y2', function () { return height; })
            .attr('class', 'today-line');
    },

    // _setZoomer: function () {
    //     var svg = d3.select('#rootSurface');
    //     gApp.zoom = d3.zoom()
    //         .on("zoom", gApp._zoomed);
    //     svg.call(gApp.zoom);
    // },

    // _zoomed: function () {
    //     var maxDate = new Date("1 Jan 1970");
    //     var minDate = new Date("31 Dec 2999");
    //     gApp.gX.call(gApp.xAxis.scale(d3.event.transform.rescaleX(gApp.dateScaler)));
    //     var data = gApp.gX.selectAll('g');
    //     data.each(function (d) {
    //         if (d > maxDate) { maxDate = d; }
    //         if (d < minDate) { minDate = d; }
    //     });
    //     gApp._setTimeScaler(minDate, maxDate);
    //     gApp._zoomedStart();
    // },

    _zoomedStart: function () {
        gApp.down('#zoomInBtn').setDisabled(Rally.util.DateTime.getDifference(gApp.down('#axisEndDate').getValue(), gApp.down('#axisStartDate').getValue(), 'day') < 30);
        gApp._removeSVGTree();
        gApp._addSVGTree();
        gApp._refreshTree();
    },

    _rescaledStart: function () {
        gApp._setAxis();
        gApp._zoomedStart();
    },

    _startTreeAgain: function () {
        gApp._initialiseScale();
        gApp._rescaledStart();
    },

    _zoomIn: function (btn) {
        var axisStart = gApp.down('#axisStartDate');
        var startDate = axisStart.getValue();
        startDate = Ext.Date.add(startDate, Ext.Date.DAY, 14);

        var axisEnd = gApp.down('#axisEndDate');
        var endDate = axisEnd.getValue();
        endDate = Ext.Date.subtract(endDate, Ext.Date.DAY, 14);

        if (startDate < endDate) {
            if (Rally.util.DateTime.getDifference(endDate, startDate, 'day') < 30) {
                btn.setDisabled(true);
            }

            axisStart.setValue(startDate);
            axisEnd.setValue(endDate);

            gApp._setTimeScaler(startDate, endDate);
            gApp._rescaledStart();
        }
    },

    _zoomOut: function () {
        var axisStart = gApp.down('#axisStartDate');
        var startDate = axisStart.getValue();
        startDate = Ext.Date.subtract(startDate, Ext.Date.DAY, 14);

        var axisEnd = gApp.down('#axisEndDate');
        var endDate = axisEnd.getValue();
        endDate = Ext.Date.add(endDate, Ext.Date.DAY, 14);

        if (Rally.util.DateTime.getDifference(endDate, startDate, 'day') > 30) {
            gApp.down('#zoomInBtn').setDisabled(false);
        }

        axisStart.setValue(startDate);
        axisEnd.setValue(endDate);

        gApp._setTimeScaler(startDate, endDate);
        gApp._rescaledStart();
    },

    _indexTree: function (nodetree) {
        nodetree.eachBefore(function (d) {
            d.rheight = d.x1 - d.x0;
            d.rpos = d.x0 - (d.parent ? d.parent.x0 : 0); //Deal with root node
        });
    },

    _setTimeline: function (d) {
        gApp._setTimeScaler(
            new Date(d.data.record.get('PlannedStartDate')),
            new Date(d.data.record.get('PlannedEndDate'))
        );
        gApp._rescaledStart();
    },

    _getSVGHeight: function () {
        return parseInt(d3.select('#rootSurface').attr('height')) - (gApp.getSetting('showTimeLine') ? gApp._rowHeight : 0); // - (gApp.getSetting('showReleases') ? gApp._rowHeight : 0)
    },

    _itemMenu: function (d) {
        Rally.nav.Manager.edit(d.data.record);
    },

    _getGroupClass: function (d) {
        var rClass = 'clickable draggable' + ((d.children || d._children) ? ' children' : '');
        if (gApp._checkSchedule(d)) {
            rClass += ' data--errors';
        }
        return rClass;
    },

    _initReleaseTranslate: function (d) {
        d.startX = new Date(d.get('ReleaseStartDate'));
        d.endX = new Date(d.get('ReleaseDate'));

        var x = gApp.dateScaler(d.startX);
        var e = gApp.dateScaler(d.endX);

        d.drawnX = x;
        // d.drawnX = (x < 0 ? 0 : x);
        d.drawnY = -gApp._rowHeight / 1.5;
        d.drawnWidth = e - d.drawnX;
        d.drawnWidth = d.drawnWidth < 0 ? 0 : d.drawnWidth;
        d.translate = "translate(" + d.drawnX + "," + d.drawnY + ")";
    },

    _initGroupTranslate: function (d) {
        d.plannedStartX = new Date(d.data.record.get('PlannedStartDate'));
        d.plannedEndX = new Date(d.data.record.get('PlannedEndDate'));
        d.actualStartX = new Date(d.data.record.get('ActualStartDate'));
        d.actualEndX = d.data.record.get('ActualEndDate') ? new Date(d.data.record.get('ActualEndDate')) : new Date();

        var plannedX = gApp.dateScaler(d.plannedStartX);
        var plannedE = gApp.dateScaler(d.plannedEndX);
        var actualX = gApp.dateScaler(d.actualStartX);
        var actualE = gApp.dateScaler(d.actualEndX);
        var svgHeight = gApp._getSVGHeight();

        d.plannedDrawnX = plannedX;//(plannedX < 0 ? 0 : plannedX);
        d.plannedDrawnY = ((d.x0 * svgHeight) + (d.depth * gApp._rowHeight)) - (gApp._shouldShowRoot() ? 0 : gApp._rowHeight);
        d.plannedDrawnWidth = plannedE - d.plannedDrawnX;
        d.plannedDrawnWidth = d.plannedDrawnWidth < 0 ? 0 : d.plannedDrawnWidth;
        d.plannedTranslate = "translate(" + d.plannedDrawnX + "," + d.plannedDrawnY + ")";

        d.actualDrawnX = (actualX < 0 ? 0 : actualX);
        d.actualDrawnY = ((d.x0 * svgHeight) + (d.depth * gApp._rowHeight) + (gApp._rowHeight / 2)) - (gApp._shouldShowRoot() ? 0 : gApp._rowHeight);
        d.actualDrawnWidth = actualE - d.actualDrawnX;
        d.actualDrawnWidth = d.actualDrawnWidth < 0 ? 0 : d.actualDrawnWidth;
        d.actualTranslate = "translate(" + d.actualDrawnX + "," + d.actualDrawnY + ")";
    },

    _refreshTree: function () {

        var symbolWidth = 20;
        var partition = d3.partition();

        var nodetree = gApp._nodeTree;
        nodetree = partition(nodetree);
        gApp._indexTree(nodetree);

        // Expand / Collapse all
        d3.select('#zoomTree').selectAll('.expandAll')
            .data(gApp.expandData)
            .enter().append('g')
            .append('text')
            .attr('x', -20)
            .attr('y', -40)
            .attr('class', 'icon-gear app-menu')
            .attr('alignment-baseline', 'central')
            .text(function (d) { return d.expanded ? '8' : '9'; })
            .on('click', function (d) {
                d.expanded ? gApp._collapseAll() : gApp._expandAll();
                d.expanded = !d.expanded;
            });

        if (gApp.getSetting('showReleases') && gApp.releases) {
            var releases = d3.select('#zoomTree').selectAll(".releaseNode")
                .data(gApp.releases)
                .enter().append("g")
                .attr('class', 'releaseNode')
                .attr('id', function (d) { return 'release-' + d.get('Name'); })
                .attr('transform', function (d) {
                    gApp._initReleaseTranslate(d);
                    return d.translate;
                });

            // Release bars
            releases.append('rect')
                .attr('width', function (d) { return d.drawnWidth; })
                .attr('height', gApp._rowHeight / 2)
                .attr('fill', '#f2f2f2')
                .attr('stroke', '#808080')
                .attr('stroke-opacity', 0.5);

            // Release Name
            releases.append('text')
                .attr('x', function (d) { return d.drawnWidth / 2; })
                .attr('y', gApp._rowHeight / 4 + 3)
                .text(function (d) { return d.get('Name'); });

        }

        //Let's scale to the dateline
        var rows = d3.select('#zoomTree').selectAll(".node")
            .data(nodetree.descendants())
            .enter().filter(function (d) { return d.data.record.id === "root" ? gApp._shouldShowRoot() : true; })
            .append("g");

        // Create planned groups
        var plannedRows = rows.append("g").attr('class', gApp._getGroupClass)
            .attr('id', function (d) { return 'group-' + d.data.Name; })
            .attr('transform', function (d) {
                gApp._initGroupTranslate(d);
                return d.plannedTranslate;
            });

        // Create actuals groups
        var actualRows = rows.append("g")
            .attr('id', function (d) { return 'group-' + d.data.Name + '-actual'; })
            .attr('transform', function (d) {
                return d.actualTranslate;
            });

        // Display colored bars for actuals
        actualRows
            .filter(function (d) {
                return d.data.record.get('ActualStartDate');
            })
            .append('rect')
            // Round bar for completed PIs, square for in-progress
            .attr('rx', function (d) { return d.data.record.get('ActualEndDate') ? gApp._rowHeight / 8 : 0; })
            .attr('ry', function (d) { return d.data.record.get('ActualEndDate') ? gApp._rowHeight / 8 : 0; })
            .attr('y', 3)
            .attr('width', function (d) { return d.actualDrawnWidth || 1; })
            .attr('height', gApp._rowHeight / 3.5)
            .attr('fill', function (d) {
                return d.data.record.get('ActualStartDate') ? gApp._getPiHealthColor(d.data.record.data) : '#ffffff';
            })
            .attr('opacity', 0.5)
            .attr('class', 'clickable')
            .attr('id', function (d) { return 'rect-' + d.data.Name + '-actual'; });

        // Pecent done text
        actualRows.filter(function (d) { return d.data.record.get('ActualStartDate'); })
            .append('text')
            .attr('x', function (d) { return d.actualDrawnWidth / 2; })
            .attr('y', gApp._rowHeight / 4 + 2)
            .attr('style', 'font-size:10')
            .text(function (d) { return d.actualDrawnWidth ? (d.data.record.get('PercentDoneByStoryPlanEstimate') * 100).toFixed(0) + '%' : ''; });

        // Planned date bars
        plannedRows
            .filter(function (d) {
                return d.data.record.get('PlannedStartDate') && d.data.record.get('PlannedEndDate');
            })
            .append('rect')
            .attr('id', function (d) { return 'rect-' + d.data.Name; })
            .attr('rx', gApp._rowHeight / 4)
            .attr('ry', gApp._rowHeight / 4)
            .attr('width', function (d) { return d.plannedDrawnWidth; })
            .attr('height', gApp._rowHeight / 2)
            .attr('fill', function (d) { return gApp.colours[d.depth + 1]; })
            .attr('opacity', 0.5)
            //.attr('opacity', function (d) { return (d.data.record.get('PlannedStartDate') && d.data.record.get('PlannedEndDate')) ? 0.5 : 0.0; })
            .attr('class', 'clickable')
            .on('mouseover', function (d, idx, arr) { gApp._nodeMouseOver(d, idx, arr); })
            .on('mouseout', function (d, idx, arr) { gApp._nodeMouseOut(d, idx, arr); })
            .on('click', function (d, idx, arr) {
                //Browsers get confused over the shift key (think it's 'selectAll')
                if (d3.event.altKey) {
                    gApp._dataPanel(d, idx, arr);
                } else if (d.data.record.get('PlannedStartDate') && d.data.record.get('PlannedEndDate')) {
                    gApp._setTimeline(d);
                }
            });

        // Triple bar symbol (hamburger button)
        plannedRows.append('text')
            .attr('y', gApp._rowHeight / 4)
            .attr('x', function (d) { return 5 - d.plannedDrawnX; })
            .attr('alignment-baseline', 'central')
            .text('V')
            .attr('class', function (d) {
                var lClass = 'icon-gear app-menu';
                if (!d.data.record.get('PlannedStartDate') || !d.data.record.get('PlannedEndDate')) {
                    lClass += ' error';
                }
                return lClass;
            })
            .on('click', function (d) { gApp._itemMenu(d); });

        // hamburgers.append('span')
        //     .attr('class', 'tooltiptext')
        //     .text(function (d) { return 'Edit ' + d.data.record.get('FormattedID'); });

        // PI ID and Name text
        plannedRows.append('text')
            .attr('id', function (d) { return 'text-' + d.data.Name; })
            .attr('x', function (d) { return symbolWidth + 5 - d.plannedDrawnX; })
            .attr('y', gApp._rowHeight / 4)  //Should follow point size of font
            .attr('class', 'clickable normalText')
            .attr('editable', 'none')
            .attr('alignment-baseline', 'central')
            .attr('style', 'font-size:12')
            .on('mouseover', function (d, idx, arr) { gApp._nodeMouseOver(d, idx, arr); })
            .on('mouseout', function (d, idx, arr) { gApp._nodeMouseOut(d, idx, arr); })
            .on('click', function (d, idx, arr) {
                //Browsers get confused over the shift key (think it's 'selectAll')
                if (d3.event.altKey) {
                    gApp._dataPanel(d, idx, arr);
                } else if (d.data.record.get('PlannedStartDate') && d.data.record.get('PlannedEndDate')) {
                    gApp._setTimeline(d);
                }
            })
            .text(function (d) { return d.data.record.get('FormattedID') + ": " + d.data.record.get('Name'); });

        // Expand / Collapse arrows
        d3.selectAll('.children').append('text')
            .attr('x', function (d) { return -(symbolWidth + d.plannedDrawnX); })
            .attr('y', gApp._rowHeight / 4)
            .attr('class', 'icon-gear app-menu collapse-icon')
            .attr('alignment-baseline', 'central')
            .text(function (d) { return d.children ? '9' : '8'; })
            .on('click', function (d, idx, arr) { gApp._switchChildren(d, idx, arr); })
            .on('collapseAll', function (d) { gApp._collapse(d); })
            .on('expandAll', function (d) { gApp._expand(d); });

        if (gApp.down('#showDependenciesCheckbox').getValue()) {
            nodetree.each(function (d) {
                //Now add the dependencies lines
                if (!d.data.record.data.ObjectID) { return; }
                var deps = d.data.record.get('Successors');
                if (deps && deps.Count) {
                    gApp._getSuccessors(d.data.record).then(
                        {
                            success: function (succs) {
                                //Draw a circle on the end of the first one and make it flash if I can't find the end one
                                _.each(succs, function (succ) {
                                    var e = gApp._findTreeNode(gApp._getNodeTreeRecordId(succ));
                                    var zClass = '';
                                    var zoomTree = d3.select('#zoomTree');
                                    //Stuff without end point // TODO source.node is sometimes null
                                    var source = d3.select('#rect-' + d.data.Name);
                                    var x0 = source.node().getCTM().e + source.node().getBBox().width - gApp._rowHeight;
                                    var y0 = source.node().getCTM().f - gApp._rowHeight / 4;

                                    if (!e) {
                                        zClass += 'textBlink';
                                    } else {
                                        if (gApp._sequenceError(d, e)) {
                                            zClass += (zClass.length ? ' ' : '') + 'data--errors';
                                        }
                                        else {
                                            zClass += (zClass.length ? ' ' : '') + 'no--errors';
                                        }
                                    }

                                    if (zoomTree.select('#circle-' + d.data.Name).empty()) {
                                        zoomTree.append('circle')
                                            .attr('cx', x0)
                                            .attr('cy', y0)
                                            .attr('r', 3)
                                            .attr('id', 'circle-' + d.data.Name)
                                            .on('mouseover', function (a, idx, arr) {    //'a' refers to the wrong thing!
                                                gApp._createDepsPopover(d, arr[idx], 1);
                                            })    //Default to successors
                                            .attr('class', zClass);
                                    }

                                    if (!e) {
                                        return;
                                    }
                                    //Stuff that needs endpoint
                                    var target = d3.select('#rect-' + e.data.Name);
                                    var x1 = target.node().getCTM().e - gApp._rowHeight;
                                    var y1 = target.node().getCTM().f - (gApp._rowHeight / 4);

                                    zoomTree.append('circle')
                                        .attr('cx', x1)
                                        .attr('cy', y1)
                                        .attr('r', 3)
                                        .on('mouseover', function (a, idx, arr) { gApp._createDepsPopover(e, arr[idx], 0); })    //Default to successors
                                        .attr('class', zClass);

                                    zClass += (zClass.length ? ' ' : '') + 'dashed' + d.data.record.get('PortfolioItemType').Ordinal.toString();

                                    if (d.data.record.get('PortfolioItemType').Ordinal === 0) {
                                        zoomTree.append('path')
                                            .attr('d',
                                                'M' + x0 + ',' + y0 +
                                                'C' + (x0 + 150) + ',' + (y0 + (y1 - y0) / 8) +
                                                ' ' + (x1 - 150) + ',' + (y1 - (y1 - y0) / 8) +
                                                ' ' + x1 + ',' + y1)
                                            .attr('class', zClass);
                                    }
                                });
                            }
                        }
                    );
                }
            });
        }
    },

    _createDepsPopover: function (node, circ, tabOverride) {
        //Create a zero size container right where the blob is and attach the 
        //popover to that
        var panel = Ext.create('Rally.ui.popover.DependenciesPopover',
            {
                record: node.data.record,
                target: circ,
                autoShow: false,
                showChevron: false,
                listeners: {
                    show: function () {
                        var activeTab = (node.data.record.get('PredecessorsAndSuccessors').Predecessors === 0) &&
                            (node.data.record.get('PredecessorsAndSuccessors').Successors > 0);
                        panel._getTabPanel().setActiveTab((tabOverride !== undefined) ? tabOverride : (activeTab ? 1 : 0));
                        panel.el.setLeftTop(parseInt(circ.getBBox().x + circ.getBBox().width + gApp._rowHeight),
                            parseInt(circ.getBBox().y + (gApp._rowHeight / 2))
                        );
                    }
                }
            }
        );
        panel.show();
    },

    _checkSchedule: function (d, start, end) {
        if (!d.parent || !d.parent.data.record.data.ObjectID || d.parent.id === 'root') { return false; }  //Top level item doesn't have a parent
        var childStart = (start === undefined) ? d.data.record.get('PlannedStartDate') : start;
        var childEnd = (end === undefined) ? d.data.record.get('PlannedEndDate') : end;
        return (childEnd > d.parent.data.record.get('PlannedEndDate')) ||
            (childStart < d.parent.data.record.get('PlannedStartDate'));
    },

    _sequenceError: function (a, b) {
        return (a.data.record.get('PlannedEndDate') > b.data.record.get('PlannedStartDate'));
    },

    _getSuccessors: function (record) {
        var deferred = Ext.create('Deft.Deferred');
        var config = {
            fetch: gApp.STORE_FETCH_FIELD_LIST,
            callback: function (records, operation, success) {
                if (success) {
                    deferred.resolve(records);
                } else {
                    deferred.reject(operation);
                }
            }
        };
        record.getCollection('Successors').load(config);
        return deferred.promise;
    },

    _nodeMouseOut: function (node) {
        if (node.data.card) { node.data.card.hide(); }
    },

    _nodeMouseOver: function (node) {
        if (!(node.data.record.data.ObjectID)) {
            //Only exists on real items, so do something for the 'unknown' item
            return;
        } else {
            if (!node.data.card) {
                var card = Ext.create('Rally.ui.cardboard.Card', {
                    'record': node.data.record,
                    fields: gApp.CARD_DISPLAY_FIELD_LIST,
                    constrain: false,
                    closable: true,
                    width: gApp.MIN_COLUMN_WIDTH,
                    height: 'auto',
                    floating: true, //Allows us to control via the 'show' event
                    shadow: false,
                    showAge: true,
                    resizable: true,
                    listeners: {
                        show: function (card) {
                            //Move card to one side, preferably closer to the centre of the screen
                            var xpos = d3.event.clientX;
                            var ypos = d3.event.clientY;
                            card.el.setLeftTop((xpos - (this.getSize().width + 20)) < 0 ? (xpos + 20) : (xpos - (this.getSize().width + 20)),
                                (ypos + this.getSize().height) > gApp.getSize().height ? (gApp.getSize().height - (this.getSize().height + 20)) : (ypos + 10));  //Tree is rotated
                        }
                    }
                });
                node.data.card = card;
            }
            node.data.card.show();
        }
    },

    _nodePopup: function (node) {
        Ext.create('Rally.ui.popover.DependenciesPopover',
            {
                record: node.data.record,
                target: node.data.card.el
            }
        );
    },

    _nodeClick: function (node, index, array) {
        if (!(node.data.record.data.ObjectID)) { return; } //Only exists on real items
        //Get ordinal (or something ) to indicate we are the lowest level, then use "UserStories" instead of "Children"
        if (event.altKey) {
            gApp._nodePopup(node, index, array);
        } else {
            gApp._dataPanel(node, index, array);
        }
    },

    _dataPanel: function (node, index, array) {
        var childField = node.data.record.hasField('Children') ? 'Children' : 'UserStories';
        var model = node.data.record.hasField('Children') ? node.data.record.data.Children._type : 'UserStory';

        Ext.create('Rally.ui.dialog.Dialog', {
            autoShow: true,
            draggable: true,
            closable: true,
            width: 1200,
            height: 800,
            style: {
                border: "thick solid #000000"
            },
            overflowY: 'scroll',
            overflowX: 'none',
            record: node.data.record,
            disableScroll: false,
            model: model,
            childField: childField,
            title: 'Information for ' + node.data.record.get('FormattedID') + ': ' + node.data.record.get('Name'),
            layout: 'hbox',
            items: [
                {
                    xtype: 'container',
                    itemId: 'leftCol',
                    width: 500,
                },
                {
                    xtype: 'container',
                    itemId: 'rightCol',
                    width: 700  //Leave 20 for scroll bar
                }
            ],
            listeners: {
                afterrender: function () {
                    this.down('#leftCol').add(
                        {
                            xtype: 'rallycard',
                            record: this.record,
                            fields: gApp.CARD_DISPLAY_FIELD_LIST,
                            showAge: true,
                            resizable: true
                        }
                    );

                    if (this.record.get('c_ProgressUpdate')) {
                        this.down('#leftCol').insert(1,
                            {
                                xtype: 'component',
                                width: '100%',
                                autoScroll: true,
                                html: this.record.get('c_ProgressUpdate')
                            }
                        );
                        this.down('#leftCol').insert(1,
                            {
                                xtype: 'text',
                                text: 'Progress Update: ',
                                style: {
                                    fontSize: '13px',
                                    textTransform: 'uppercase',
                                    fontFamily: 'ProximaNova,Helvetica,Arial',
                                    fontWeight: 'bold'
                                },
                                margin: '0 0 10 0'
                            }
                        );
                    }
                    //This is specific to customer. Features are used as RAIDs as well.
                    if ((this.record.self.ordinal === 1) && this.record.hasField('c_RAIDType')) {
                        var me = this;
                        var rai = this.down('#leftCol').add(
                            {
                                xtype: 'rallypopoverchilditemslistview',
                                target: array[index],
                                record: this.record,
                                childField: this.childField,
                                addNewConfig: null,
                                gridConfig: {
                                    title: '<b>Risks and Issues:</b>',
                                    enableEditing: false,
                                    enableRanking: false,
                                    enableBulkEdit: false,
                                    showRowActionsColumn: false,
                                    storeConfig: this.RAIDStoreConfig(),
                                    columnCfgs: [
                                        'FormattedID',
                                        'Name',
                                        {
                                            text: 'RAID Type',
                                            dataIndex: 'c_RAIDType',
                                            minWidth: 80
                                        },
                                        {
                                            text: 'RAG Status',
                                            dataIndex: 'Release',  //Just so that a sorter gets called on column ordering
                                            width: 60,
                                            renderer: function (value, metaData, record, rowIdx, colIdx, store) {
                                                var setColour = (record.get('c_RAIDType') === 'Risk') ?
                                                    me.RISKColour : me.AIDColour;

                                                return '<div ' +
                                                    'class="' + setColour(
                                                        record.get('c_RAIDSeverityCriticality'),
                                                        record.get('c_RISKProbabilityLevel'),
                                                        record.get('c_RAIDRequestStatus')
                                                    ) +
                                                    '"' +
                                                    '>&nbsp</div>';
                                            },
                                            listeners: {
                                                mouseover: function (gridView, cell, rowIdx, cellIdx, event, record) {
                                                    Ext.create('Rally.ui.tooltip.ToolTip', {
                                                        target: cell,
                                                        html:
                                                            '<p>' + '   Severity: ' + record.get('c_RAIDSeverityCriticality') + '</p>' +
                                                            '<p>' + 'Probability: ' + record.get('c_RISKProbabilityLevel') + '</p>' +
                                                            '<p>' + '     Status: ' + record.get('c_RAIDRequestStatus') + '</p>'
                                                    });

                                                    return true;    //Continue processing for popover
                                                }
                                            }
                                        },
                                        'ScheduleState'
                                    ]
                                },
                                model: this.model
                            }
                        );
                        rai.down('#header').destroy();
                    }
                    var children = this.down('#rightCol').add(
                        {
                            xtype: 'rallypopoverchilditemslistview',
                            target: array[index],
                            record: this.record,
                            width: '95%',
                            childField: this.childField,
                            addNewConfig: null,
                            gridConfig: {
                                title: '<b>Children:</b>',
                                enableEditing: false,
                                enableRanking: false,
                                enableBulkEdit: false,
                                showRowActionsColumn: false,
                                storeConfig: this.nonRAIDStoreConfig(),
                                columnCfgs: [
                                    'FormattedID',
                                    'Name',
                                    {
                                        text: '% By Count',
                                        dataIndex: 'PercentDoneByStoryCount'
                                    },
                                    {
                                        text: '% By Est',
                                        dataIndex: 'PercentDoneByStoryPlanEstimate'
                                    },
                                    {
                                        text: 'Timebox',
                                        dataIndex: 'Project',  //Just so that the renderer gets called
                                        minWidth: 80,
                                        renderer: function (value, metaData, record, rowIdx, colIdx, store) {
                                            var retval = '';
                                            if (record.hasField('Iteration')) {
                                                retval = record.get('Iteration') ? record.get('Iteration').Name : 'NOT PLANNED';
                                            } else if (record.hasField('Release')) {
                                                retval = record.get('Release') ? record.get('Release').Name : 'NOT PLANNED';
                                            } else if (record.hasField('PlannedStartDate')) {
                                                retval = Ext.Date.format(record.get('PlannedStartDate'), 'd/M/Y') + ' - ' + Ext.Date.format(record.get('PlannedEndDate'), 'd/M/Y');
                                            }
                                            return (retval);
                                        }
                                    },
                                    'State',
                                    'PredecessorsAndSuccessors',
                                    'ScheduleState'
                                ]
                            },
                            model: this.model
                        }
                    );
                    children.down('#header').destroy();

                    var cfd = Ext.create('Rally.apps.CFDChart', {
                        record: this.record,
                        width: '95%',
                        container: this.down('#rightCol')
                    });
                    cfd.generateChart();

                }
            },

            //This is specific to customer. Features are used as RAIDs as well.
            nonRAIDStoreConfig: function () {
                if (this.record.hasField('c_RAIDType')) {
                    switch (this.record.self.ordinal) {
                        case 1:
                            return {
                                filters: {
                                    property: 'c_RAIDType',
                                    operator: '=',
                                    value: ''
                                },
                                fetch: gApp.STORE_FETCH_FIELD_LIST,
                                pageSize: 50
                            };
                        default:
                            return {
                                fetch: gApp.STORE_FETCH_FIELD_LIST,
                                pageSize: 50
                            };
                    }
                }
                else {
                    return {
                        fetch: gApp.STORE_FETCH_FIELD_LIST,
                        pageSize: 50
                    };
                }
            },

            //This is specific to customer. Features are used as RAIDs as well.
            RAIDStoreConfig: function () {
                if (this.record.hasField('c_RAIDType')) {
                    return {
                        filters: [{
                            property: 'c_RAIDType',
                            operator: '!=',
                            value: ''
                        }],
                        fetch: gApp.STORE_FETCH_FIELD_LIST,
                        pageSize: 50
                    };
                }
                else {
                    return {
                        fetch: gApp.STORE_FETCH_FIELD_LIST,
                        pageSize: 50
                    };
                }
            },

            RISKColour: function (severity, probability, state) {
                if (state === 'Closed' || state === 'Cancelled') {
                    return 'RAID-blue';
                }

                if (severity === 'Exceptional') {
                    return 'RAID-red textBlink';
                }

                if (severity === 'High' && (probability === 'Likely' || probability === 'Certain')) {
                    return 'RAID-red';
                }

                if (
                    (severity === 'High' && (probability === 'Unlikely' || probability === 'Possible')) ||
                    (severity === 'Moderate' && (probability === 'Likely' || probability === 'Certain'))
                ) {
                    return 'RAID-amber';
                }
                if (
                    (severity === 'Moderate' && (probability === 'Unlikely' || probability === 'Possible')) ||
                    (severity === 'Low')
                ) {
                    return 'RAID-green';
                }

                var lClass = 'RAID-missing';
                if (!severity) { lClass += '-severity'; }
                if (!probability) { lClass += '-probability'; }

                return lClass;
            },

            AIDColour: function (severity, probability, state) {
                if (state === 'Closed' || state === 'Cancelled') {
                    return 'RAID-blue';
                }

                if (severity === 'Exceptional') {
                    return 'RAID-red';
                }

                if (severity === 'High') {
                    return 'RAID-amber';
                }

                if ((severity === 'Moderate') ||
                    (severity === 'Low')
                ) {
                    return 'RAID-green';
                }
                return 'RAID-missing-severity-probability'; //Mark as unknown
            }
        });
    },

    _nodes: [],

    onSettingsUpdate: function () {
        gApp._refreshTimeline();
    },

    onAncestorFilterChange: function () {
        gApp._refreshTimeline();
    },

    onTimeboxScopeChange: function (newTimebox) {
        this.callParent(arguments);
        gApp.timeboxScope = newTimebox;
        gApp._refreshTimeline();
    },

    _onFilterChange: function (inlineFilterButton) {
        gApp.advFilters = inlineFilterButton.getTypesAndFilters().filters;

        // If user clears filters, update timeline, otherwise store the added filter
        if (gApp.advFilters.length) { gApp.down('#applyFiltersBtn').setDisabled(false); }
        else { gApp._applyFilters(gApp.down('#applyFiltersBtn')); }
    },

    _onTargetFilterChange: function (combobox, newValue) {
        gApp.filterOrdinal = newValue;
        gApp.down('#applyFiltersBtn').setDisabled(false);
    },

    _onTypeChange: function (combobox, newValue) {
        gApp._refreshTimeline();
    },

    _applyFilters: function (btn) {
        btn.setDisabled(true);
        gApp._refreshTimeline();
    },

    _toggleHideAncestorFilter: function () {
        gApp.ancestorFilterPlugin.renderArea.animate({
            to: { width: gApp.ancestorFilterPlugin.renderArea.getWidth() ? 0 : '100%' }
        });
    },

    _onFilterReady: function (inlineFilterPanel) {
        gApp.down('#filterBox').add(inlineFilterPanel);

        // Button to apply filters
        gApp.down('rallyquickfilterpanel').add({
            xtype: 'rallybutton',
            itemId: 'applyFiltersBtn',
            handler: gApp._applyFilters,
            text: 'Apply filters to timeline',
            cls: 'apply-filters-button',
            disabled: true
        });

        // Dropdown for specifying which PI type the filters apply to
        var combo = gApp.down('rallyquickfilterpanel').add({
            xtype: 'rallyportfolioitemtypecombobox',
            fieldLabel: 'Filter and project scoping apply to',
            labelSeparator: '',
            labelWidth: 100,
            width: 200,
            labelStyle: 'line-height: 15px; margin-top: -8px; margin-right: 0;',
            displayField: 'Name',
            valueField: 'Ordinal',
            allowNoEntry: false,
            itemId: 'filterTargetCombo',
            cls: 'filter-target-combo',
            listeners: {
                'change': gApp._onTargetFilterChange,
                'ready': function () { this.setValue(0); }
            }
        });
    },

    _onAxisDateChange: function () {
        var axisStart = gApp.down('#axisStartDate');
        var startDate = axisStart.getValue();

        var axisEnd = gApp.down('#axisEndDate');
        var endDate = axisEnd.getValue();

        if (endDate < startDate) {
            Rally.ui.notify.Notifier.showError({ message: 'End date must be greater than start date' });
            return;
        }

        gApp._setTimeScaler(startDate, endDate);
        gApp._rescaledStart();
    },

    _refreshTargetFilters: function () {

    },

    _refreshTimeline: function () {
        // TODO: this is kind of a hack for dealing with multiple 'select' listeners
        // You should fix this later
        if (gApp.loadingTimeline) {
            return;
        }

        if (gApp.ancestorFilterPlugin.piSelector) {
            gApp.ancestorFilterPlugin.piSelector.queryDelay = 1250;
        }

        gApp._removeSVGTree();
        gApp._clearNodes();
        // Reset height so the loading mask shows properly
        var rs = gApp.down('#rootSurface');
        rs.getEl().setHeight(300);

        var onError = function (msg) {
            gApp._showError(msg);
            gApp.setLoading(false);
            gApp.loadingTimeline = false;
        };

        gApp.setLoading('Loading portfolio items...');
        gApp.loadingTimeline = true;

        // Ancestor plugin gives us the ref and typepath, so we need to fetch
        // the actual record before proceeding
        var piData = gApp.ancestorFilterPlugin._getValue();
        if (piData.pi) {
            gApp._fetchRecordByRef(piData, function (store, records, success) {
                if (success) {
                    if (records && records.length) {
                        gApp.loadingTimeline = true;
                        records[0].id = 'root';

                        new Promise(function (resolve, reject) {
                            gApp._getArtifactsFromRoot(records, resolve, reject);
                        }).then(
                            // RESOLVE
                            function () {
                                if (gApp.getSetting('showReleases') && !gApp.releases) {
                                    gApp._getReleases().then(
                                        function () { },
                                        function () { gApp._showError('Failed to fetch releases'); }
                                    ).finally(function () {
                                        gApp._redrawNodeTree();
                                    });
                                }
                                else {
                                    gApp._redrawNodeTree();
                                }
                            },
                            // REJECT
                            function (error) {
                                gApp._showError(`Failed while fetching portfolio items. ${gApp._parseError(error, 'Please reload and try again.')}`);
                            }
                        ).finally(function () {
                            gApp.expandData.expanded = true;
                            gApp.setLoading(false);
                            gApp.loadingTimeline = false;
                        });
                    }
                    else {
                        onError('Failed to retrieve selected portfolio item. Please reload and try again.');
                    }
                }
                else {
                    onError('Failed to retrieve selected portfolio item. Please reload and try again.');
                }
            });
        }
        // No ancestor selected, load all PIs starting at selected type
        else {
            var topType = gApp._getSelectedAncestorType();
            if (topType) {
                new Promise(function (resolve, reject) {
                    gApp._getArtifacts(topType, resolve, reject);
                }).then(
                    // RESOLVE
                    function () {
                        if (gApp.getSetting('showReleases') && !gApp.releases) {
                            gApp._getReleases().then(
                                function () { },
                                function () {
                                    gApp._showError('Failed to fetch releases');
                                }
                            ).finally(function () {
                                gApp._redrawNodeTree();
                            });
                        }
                        else {
                            gApp._redrawNodeTree();
                        }
                    },
                    // REJECT
                    function (error) {
                        gApp._showError(`Failed while fetching portfolio items. ${gApp._parseError(error, 'Please reload and try again.')}`);
                    }
                ).finally(function () {
                    gApp.expandData.collapsed = true;
                    gApp.setLoading(false);
                    gApp.loadingTimeline = false;
                });
            }
        }
    },

    _kickOff: function () {
        gApp.expandData = [{ expanded: false }];
        gApp._typeStore = gApp.ancestorFilterPlugin.portfolioItemTypes;

        var childTypes = gApp._getTypeList(gApp._highestOrdinal() - 1);
        var childModels = [];
        _.each(childTypes, function (model) { childModels.push(model.Type); });

        if (gApp.ancestorFilterPlugin.piTypeSelector) {
            gApp.ancestorFilterPlugin.piTypeSelector.on('select', gApp._refreshTimeline);
        }

        var controlContainer = gApp.ancestorFilterPlugin.renderArea.add({
            xtype: 'container',
            itemId: 'filterExportControls',
            minWidth: 215,
            margin: '3 9 3 10',
            layout: {
                type: 'hbox',
                align: 'stretch'
            }
        });

        // controlContainer.add({
        //     xtype: 'container',
        //     itemId: 'filterTargetContainer'
        //     // layout: {
        //     //     type: 'hbox',
        //     //     align: 'middle'
        //     // }
        // });

        // Load the inline filter if settings specify such
        if (gApp.getSetting('showFilter') && !gApp.down('#inlineFilter')) {
            controlContainer.add({
                xtype: 'rallyinlinefiltercontrol',
                name: 'inlineFilter',
                itemId: 'inlineFilter',
                padding: '0 0 5 0',
                context: this.getContext(),
                height: 26,
                inlineFilterButtonConfig: {
                    stateful: true,
                    stateId: this.getContext().getScopedStateId('inline-filter'),
                    context: this.getContext(),
                    modelNames: childModels, // TODO maybe update modelNames when piTypeSelector changes
                    filterChildren: false,
                    inlineFilterPanelConfig: {
                        width: '98%',
                        quickFilterPanelConfig: {
                            defaultFields: ['ArtifactSearch', 'Owner']
                        }
                    },
                    listeners: {
                        inlinefilterchange: this._onFilterChange,
                        inlinefilterready: this._onFilterReady,
                        scope: this
                    }
                }
            });
        }

        var fontStyle = 'font-size: 14px';
        var additionalSettingsArea = gApp.down('#additionalSettingsArea');
        additionalSettingsArea.add([
            {
                xtype: 'rallydatefield',
                fieldLabel: 'Axis Start',
                labelSeparator: '',
                value: new Date(),
                itemId: 'axisStartDate',
                labelStyle: fontStyle + '; margin-right: 0;',
                labelWidth: 65,
                margin: '0 20 0 0',
                validateOnChange: true,
                listeners: { aftervalidate: gApp._onAxisDateChange }
            },
            {
                xtype: 'rallydatefield',
                fieldLabel: 'Axis End',
                labelSeparator: '',
                value: new Date(),
                itemId: 'axisEndDate',
                labelStyle: fontStyle + '; margin-right: 0;',
                labelWidth: 65,
                margin: '0 20 0 0',
                validateOnChange: true,
                listeners: { aftervalidate: gApp._onAxisDateChange }
            },
            {
                xtype: 'container',
                id: 'zoomArea',
                layout: {
                    type: 'hbox',
                    align: 'middle'
                },
                items: [
                    {
                        xtype: 'text',
                        text: 'Zoom',
                        style: fontStyle,
                        width: 40,
                        margin: '0 5 0 0',
                        itemId: 'zoomLabel'
                    },
                    {
                        xtype: 'rallybutton',
                        itemId: 'zoomOutBtn',
                        id: 'zoomOutBtn',
                        margin: '0 10 0 0',
                        iconCls: 'icon-collapse',
                        handler: gApp._zoomOut
                    },
                    {
                        xtype: 'rallybutton',
                        itemId: 'zoomInBtn',
                        id: 'zoomInBtn',
                        iconCls: 'icon-expand',
                        handler: gApp._zoomIn,
                        margin: '0 20 0 0',
                    }
                ]
            },
            {
                xtype: 'rallycheckboxfield',
                itemId: 'showDependenciesCheckbox',
                fieldLabel: 'Dependency Strings',
                labelStyle: 'font-size: 12px',
                labelWidth: 80,
                labelSeparator: '',
                name: 'showDependencies',
                value: false,
                handler: gApp._rescaledStart,
                margin: '0 20 0 0'
            },
            {
                xtype: 'text',
                text: 'Export',
                style: fontStyle,
                width: 45,
                margin: 0,
                itemId: 'exportLabel'
            },
            {
                xtype: 'rallybutton',
                iconCls: 'icon-export',
                height: 22,
                toolTipText: 'Export Timeline...',
                handler: gApp._exportTimeline
            }
        ]);

        if (gApp._isAncestorSelected()) {
            gApp._refreshTargetFilters();
        }

        gApp._refreshTimeline();
    },

    _buildConfig: function (type, parentRecords) {
        var config = {
            model: type.get('TypePath'),
            sorters: [{
                property: 'DragAndDropRank',
                direction: 'ASC'
            }],
            pageSize: 600,
            limit: 600,
            fetch: gApp.STORE_FETCH_FIELD_LIST,
            filters: []
        };
        if (gApp.getSetting('hideArchived')) {
            config.filters.push({
                property: 'Archived',
                operator: '=',
                value: false
            });
        }

        var dataContext = gApp.getContext().getDataContext();

        if ((!gApp._isAncestorSelected() && !parentRecords) || (type.get('Ordinal') === gApp.filterOrdinal && !gApp.ancestorFilterPlugin.getIgnoreProjectScope())) {
            // Keep project scoping
        }
        else {
            dataContext.project = null;
        }

        if (type.get('Ordinal') === gApp.filterOrdinal) {
            if (gApp.getSetting('showFilter') && gApp.advFilters && gApp.advFilters.length > 0) {
                Ext.Array.each(gApp.advFilters, function (filter) {
                    config.filters.push(filter);
                });
            }

            // Can only do releases and milestones, not iterations
            if ((gApp.timeboxScope && gApp.timeboxScope.type.toLowerCase() === 'release') ||
                (gApp.timeboxScope && gApp.timeboxScope.type.toLowerCase() === 'milestone')
            ) {
                config.filters.push(gApp.timeboxScope.getQueryFilter());
            }


        }
        // else {
        //     if (gApp._isAncestorSelected() || parentRecords) {// || type.get('Ordinal') !== gApp.down('#filterTimelineCombo').getValue()) {
        //         dataContext.project = null;
        //     }
        // }

        // Parents have been filtered so we only want children underneath those
        // parents that were returned to avoid breaking the tree
        // type.get('Ordinal') < gApp.filterOrdinal && 
        if (parentRecords) {
            var parentIds = [];

            _.each(parentRecords, function (parent) {
                parentIds.push(parent.get('ObjectID'));
            });

            var parentFilter = new Rally.data.wsapi.Filter({
                property: 'Parent.ObjectID',
                operator: 'in',
                value: parentIds
            });
            parentFilter.toString = function () { return '(Parent.ObjectID in ,' + parentIds.join(',') + ')'; };
            config.filters.push(parentFilter);
        }
        else {
            if (gApp._isAncestorSelected()) {
                config.filters.push(gApp.ancestorFilterPlugin.getFilterForType(type.get('TypePath')));
            }
        }

        config.context = dataContext;

        return Ext.clone(config);
    },

    _getArtifactsFromRoot: function (records, resolve, reject) {
        if (records.length) {
            gApp._nodes = gApp._nodes.concat(gApp._createNodes(records));
            var childType = gApp._findChildType(records[0]);

            if (childType) {
                var config = gApp._buildConfig(childType, records);
                try {
                    Ext.create('Rally.data.wsapi.Store', config).load()
                        .then({
                            success: function (results) {
                                gApp._getArtifactsFromRoot(results, resolve, reject);
                            },
                            failure: function (error) { reject(error); },
                            scope: this
                        });
                }
                catch (e) {
                    gApp._parseError(e, 'Failure while loading artifacts. Please reload and try again.');
                    gApp.setLoading(false);
                    gApp.loadingTimeline = false;
                }
            }
            else { resolve(); }
        }
        else { resolve(); }
    },

    _getArtifacts: function (topType, resolve, reject) {
        var config = gApp._buildConfig(topType);
        try {
            Ext.create('Rally.data.wsapi.Store', config).load()
                .then({
                    success: function (results) {
                        gApp._nodes = gApp._createNodes([{
                            id: 'root',
                            parent: null,
                            data: {
                                '_ref': 'root',
                                Parent: null,
                                ObjectID: 'root',
                                FormattedID: 'root',
                                _type: 'root'
                            },
                            get: function (fieldName) {
                                return this.data[fieldName] || null;
                            }
                        }]);
                        var promises = [];
                        _.forEach(results, function (record) {
                            record.data.Parent = { '_ref': 'root', ObjectID: 'root' };
                            // promises.push(new Promise(function (newResolve, newReject) {
                            //     gApp._getArtifactsFromRoot([record], newResolve, newReject);
                            // }));
                        });
                        gApp._getArtifactsFromRoot(results, resolve, reject);
                        // Promise.all(promises).then(
                        //     function () { resolve(); },
                        //     function (error) { reject(error); }
                        // );
                    },
                    failure: function (error) { reject(error); },
                    scope: this
                });
        }
        catch (e) { reject(e); }
    },

    _getReleases: async function () {
        var defaultProjectID = 167513414724;
        var projectID = gApp.getContext().getProject().ObjectID;
        var project;

        // Try to fetch default project
        var store = Ext.create('Rally.data.wsapi.Store', {
            model: 'Project',
            autoLoad: false,
            pageSize: 1,
            fetch: ['ObjectID'],
            filters: [{
                property: 'ObjectID',
                operator: '=',
                value: defaultProjectID
            }],
            context: { project: null }
        });
        project = await store.load();

        if (project && project.length) {
            projectID = defaultProjectID;
        }
        else {
            // User doesn't have access to default project
            // Walk up the project hierarchy to get top-most project to which user has access
            do {
                store = Ext.create('Rally.data.wsapi.Store', {
                    model: 'Project',
                    autoLoad: false,
                    pageSize: 1,
                    fetch: ['ObjectID', 'Parent'],
                    filters: [{
                        property: 'ObjectID',
                        operator: '=',
                        value: projectID
                    }],
                    context: { project: null }
                });
                project = await store.load();

                if (project && project.length && project[0].get('Parent')) {
                    projectID = project[0].get('Parent').ObjectID;
                }
            }
            while (project && project.length && project[0].get('Parent'));
        }

        return new Promise(function (resolve, reject) {
            Ext.create('Rally.data.wsapi.Store', {
                model: 'Release',
                autoLoad: true,
                limit: Infinity,
                fetch: ['Name', 'ReleaseStartDate', 'ReleaseDate'],
                filters: [{
                    property: 'Project.ObjectID',
                    operator: '=',
                    value: projectID
                }],
                context: {
                    project: null,
                    projectScopeDown: false,
                    projectScopeUp: false
                },
                listeners: {
                    load: function (store, records, success) {
                        if (success) {
                            if (!records.length) {
                                Rally.ui.notify.Notifier.showError({ message: 'Failed to find any releases' });
                            }
                            gApp.releases = records;
                            resolve();
                        }
                        else { reject(); }
                    }
                }
            });
        });
    },

    _createNodes: function (data) {
        //These need to be sorted into a hierarchy based on what we have. We are going to add 'other' nodes later
        var nodes = [];
        //Push them into an array we can reconfigure
        _.each(data, function (record) {
            nodes.push({ 'Name': record.data.FormattedID, 'record': record, 'dependencies': [] });
        });
        return nodes;
    },

    _clearNodes: function () {
        if (gApp._nodes) {
            gApp._removeCards();
            gApp._nodes = [];
        }
    },

    _findNode: function (nodes, recordData) {
        var returnNode = null;
        _.each(nodes, function (node) {
            if (node.record && (node.record.data._ref === recordData._ref)) {
                returnNode = node;
            }
        });
        return returnNode;
    },

    _findNodeById: function (nodes, id) {
        return _.find(nodes, function (node) {
            return node.record.data._ref === id;
        });
    },

    _findParentNode: function (nodes, child) {
        if (child.record.data.ObjectID === 'root') { return null; }
        var parent = child.record.data.Parent;
        var pParent = null;
        if (parent) {
            //Check if parent already in the node list. If so, make this one a child of that one
            //Will return a parent, or null if not found
            pParent = gApp._findNode(nodes, parent);
        }
        else {
            //Here, there is no parent set, so attach to the 'null' parent.
            var pt = gApp._findParentType(child.record);
            //If we are at the top, we will allow d3 to make a root node by returning null
            //If we have a parent type, we will try to return the null parent for this type.
            if (pt) {
                var parentName = '/' + pt + '/null';
                pParent = gApp._findNodeById(nodes, parentName);
            }
        }
        //If the record is a type at the top level, then we must return something to indicate 'root'
        return pParent ? pParent : gApp._findNodeById(nodes, 'root');
    },

    _fetchRecordByRef: function (type, callback) {
        var oid = Rally.util.Ref.getOidFromRef(type.pi);
        Ext.create('Rally.data.wsapi.Store', {
            model: type.piTypePath,
            autoLoad: true,
            pageSize: 1,
            fetch: gApp.STORE_FETCH_FIELD_LIST,
            filters: [{
                property: 'ObjectID',
                operator: '=',
                value: oid
            }],
            context: { project: null },
            listeners: { load: callback }
        });
    },

    /*    Routines to manipulate the types    */

    _findTypeByOrdinal: function (ord) {
        return _.find(gApp._typeStore, function (type) { return type.get('Ordinal') === ord; });
    },

    _findParentType: function (record) {
        var ord = null;
        for (var i = 0; i < gApp._typeStore.length; i++) {
            if (record.data._type.toLowerCase() === gApp._typeStore[i].get('TypePath').toLowerCase()) {
                ord = gApp._typeStore[i].get('Ordinal');
                ord++;
                break;
            }
        }
        if (!ord || ord >= gApp._typeStore.length) {
            return null;
        }
        var typeRecord = gApp._findTypeByOrdinal(ord);
        return (typeRecord && typeRecord.get('TypePath').toLowerCase());
    },

    _findChildType: function (record) {
        var ord = null;
        for (var i = 0; i < gApp._typeStore.length; i++) {
            if (record.data._type.toLowerCase() === gApp._typeStore[i].get('TypePath').toLowerCase()) {
                ord = gApp._typeStore[i].get('Ordinal');
                ord--;
                break;
            }
        }
        if (ord === null || ord < 0) {
            return null;
        }
        var typeRecord = gApp._findTypeByOrdinal(ord);
        return typeRecord;
    },

    _getSelectedAncestorTypeOrdinal: function () {
        var type = gApp._getSelectedAncestorType();
        return type ? type.get('Ordinal') : 0;
    },

    _getSelectedAncestorTypePath: function () {
        return gApp.ancestorFilterPlugin._getValue().piTypePath;
    },

    _getSelectedAncestorType: function () {
        var typePath = gApp._getSelectedAncestorTypePath();
        var type = _.find(gApp._typeStore, function (thisType) { return thisType.get('TypePath') === typePath; });
        return type;
    },

    _isAncestorSelected: function () {
        return gApp.ancestorFilterPlugin._getValue().pi;
    },

    _getTypeList: function (highestOrdinal) {
        var piModels = [];
        _.each(gApp._typeStore, function (type) {
            //Only push types below that selected
            if (type.get('Ordinal') <= (highestOrdinal ? highestOrdinal : 0)) {
                piModels.push({ 'Type': type.get('TypePath').toLowerCase(), 'Name': type.get('Name'), 'Ref': type.get('_ref'), 'Ordinal': type.get('Ordinal') });
            }
        });
        return piModels;
    },

    _highestOrdinal: function () {
        return _.max(gApp._typeStore, function (type) { return type.get('Ordinal'); }).get('Ordinal');
    },

    _getModelFromOrd: function (number) {
        var model = null;
        _.each(gApp._typeStore, function (type) { if (number === type.get('Ordinal')) { model = type; } });
        return model && model.get('TypePath');
    },

    _getOrdFromModel: function (modelName) {
        var model = null;
        _.each(gApp._typeStore, function (type) {
            if (modelName.toLowerCase() === type.get('TypePath').toLowerCase()) {
                model = type.get('Ordinal');
            }
        });
        return model;
    },

    _shouldShowRoot() {
        if (!gApp._isAncestorSelected()) { return false; }
        else { return gApp.getSetting('includeAncestor'); }
    },

    _getNodeTreeId: function (d) {
        return d.id;
    },

    _getNodeTreeRecordId: function (record) {
        return record.data._ref;
    },

    _stratifyNodeTree: function (nodes) {
        return d3.stratify()
            .id(function (d) {
                var retval = (d.record && gApp._getNodeTreeRecordId(d.record)) || null; //No record is an error in the code, try to barf somewhere if that is the case
                return retval;
            })
            .parentId(function (d) {
                var pParent = gApp._findParentNode(nodes, d);
                return (pParent && pParent.record && gApp._getNodeTreeRecordId(pParent.record));
            })
            (nodes);
    },

    _createNodeTree: function (nodes) {
        try {
            var nodetree = gApp._stratifyNodeTree(nodes);
            nodetree.sum(function (d) { return 1; });        // Set the dimensions in svg to match
            gApp._nodeTree = nodetree;      //Save for later
            return nodetree;
        }
        catch (e) {
            gApp._showError(e.message);
            console.log(e.stack);
        }
        return null;
    },

    _findTreeNode: function (id) {
        var retval = null;
        gApp._nodeTree.each(function (d) {
            if (gApp._getNodeTreeId(d) === id) {
                retval = d;
            }
        });
        return retval;
    },

    _addSVGTree: function () {
        var svg = d3.select('#rootSurface');
        svg.append("g")
            .attr("transform", "translate(" + gApp._rowHeight + "," + ((gApp.getSetting('showTimeLine') ? gApp._rowHeight / 1.5 : 0) + (gApp.getSetting('showReleases') ? gApp._rowHeight / 1.5 : 0)) + ")")
            .attr("id", "zoomTree")
            .attr('width', +svg.attr('width') - gApp._rowHeight)
            .attr('height', +svg.attr('height'))
            .append('rect')
            .attr('width', +svg.attr('width') - gApp._rowHeight)
            .attr('height', +svg.attr('height'))
            .attr('class', 'arrowbox')
            .on('click', gApp._startTreeAgain);

        svg.append("g")
            .attr("transform", "translate(0,0)")
            .attr('width', gApp._rowHeight)
            .attr("id", "staticTree");
    },

    _removeSVGTree: function () {
        if (d3.select("#zoomTree")) {
            d3.select("#zoomTree").remove();
        }
        if (d3.select("#staticTree")) {
            d3.select("#staticTree").remove();
        }
        gApp._removeCards();
    },

    _getPiHealthColor: function (record) {
        var health = Rally.util.HealthColorCalculator.calculateHealthColorForPortfolioItemData(record, 'PercentDoneByStoryPlanEstimate');
        return health.hex;
    },

    _removeCards: function () {
        _.each(gApp._nodes, function (node) {
            if (node.card) {
                node.card.destroy();
                node.card = null;
            }
        });
    },

    _exportTimeline: function () {
        if (!gApp._nodes || !gApp._nodes.length) { return; }

        var columns = [
            { dataIndex: 'FormattedID', headerText: 'Formatted ID' },
            { dataIndex: 'Name', headerText: 'Name' },
            { dataIndex: 'ObjectID', headerText: 'Object ID' },
            { dataIndex: 'Parent', headerText: 'Parent' },
            { dataIndex: 'Project', headerText: 'Project' },
            { dataIndex: 'Owner', headerText: 'Owner' },
            { dataIndex: 'PlannedStartDate', headerText: 'Planned Start Date' },
            { dataIndex: 'PlannedEndDate', headerText: 'Planned End Date' },
            { dataIndex: 'ActualStartDate', headerText: 'Actual Start Date' },
            { dataIndex: 'ActualEndDate', headerText: 'Actual End Date' },
            { dataIndex: 'PercentDoneByStoryCount', headerText: '% Done By Story Count' },
            { dataIndex: 'PercentDoneByStoryPlanEstimate', headerText: '% Done By Story Plan Estimate' },
            { dataIndex: 'PredecessorsAndSuccessors', headerText: 'Predecessors And Successors' },
            { dataIndex: 'State', headerText: 'State' },
            { dataIndex: 'PreliminaryEstimate', headerText: 'Preliminary Estimate' },
            { dataIndex: 'PortfolioItemType', headerText: 'Portfolio Item Type' },
            { dataIndex: 'Release', headerText: 'Release' }
        ];
        var exportTree = gApp._createNodeTree(gApp._nodes);
        var csvArray = [];

        var formatUtils = {
            delimiter: ",",
            rowDelimiter: "\r\n",
            re: new RegExp(',|\"|\r|\n', 'g'),
            reHTML: new RegExp('<\/?[^>]+>', 'g'),
            reNbsp: new RegExp('&nbsp;', 'ig')
        };

        var columnHeaders = _.pluck(columns, 'headerText');
        var dataKeys = _.pluck(columns, 'dataIndex');

        csvArray.push(columnHeaders.join(formatUtils.delimiter));
        gApp._addLevelToExport(exportTree, csvArray, dataKeys, formatUtils);

        var csvExportString = csvArray.join(formatUtils.rowDelimiter);
        gApp._downloadCSV(csvExportString);
    },

    _downloadCSV: function (csv) {
        var filename, link;
        if (csv === null) { return; }
        filename = 'timeline_export.csv';
        link = document.createElement('a');
        document.body.appendChild(link);
        link.style = 'display: none';
        var blob = new Blob([csv], { type: 'text/csv' });
        var url = window.URL.createObjectURL(blob);
        link.href = url;
        link.download = filename;
        link.click();
    },

    _addLevelToExport: function (exportTree, csvArray, dataKeys, formatUtils) {
        if (exportTree.data && exportTree.data.record) {
            var nodeData = [];
            _.each(dataKeys, function (key) {
                var val = exportTree.data.record.get(key);
                if (!val) { val = ''; }
                else {
                    val = (function (key, val) {
                        switch (key) {
                            case 'PlannedStartDate':
                            case 'ActualStartDate':
                            case 'PlannedEndDate':
                            case 'ActualEndDate':
                                return val.toISOString();
                            case 'Parent':
                                return val.FormattedID;
                            case 'Owner':
                                return val.DisplayName;
                            case 'PercentDoneByStoryCount':
                            case 'PercentDoneByStoryPlanEstimate':
                                return (val * 100).toFixed(0) + '%';
                            case 'PortfolioItemType':
                            case 'Project':
                            case 'State':
                            case 'Release':
                                return val.Name;
                            case 'PredecessorsAndSuccessors':
                                return 'Predecessors: ' + val.Predecessors + '\nSuccessors: ' + val.Successors;
                            case 'PreliminaryEstimate':
                                return val.Value;
                            default:
                                return val;
                        }
                    })(key, val);
                }

                if (formatUtils.reHTML.test(val)) {
                    val = val.replace('<br>', '\r\n');
                    val = Ext.util.Format.htmlDecode(val);
                    val = Ext.util.Format.stripTags(val);
                }
                if (formatUtils.reNbsp.test(val)) {
                    val = val.replace(formatUtils.reNbsp, ' ');
                }

                if (formatUtils.re.test(val)) {
                    val = val.replace(/\"/g, '\"\"');
                    val = Ext.String.format("\"{0}\"", val);
                }

                nodeData.push(val);
            });
            csvArray.push(nodeData.join(formatUtils.delimiter));
        }

        if (exportTree.children && exportTree.children.length) {
            _.each(exportTree.children, function (child) {
                gApp._addLevelToExport(child, csvArray, dataKeys, formatUtils);
            });
        }
    },

    _showError: function (msg) {
        Rally.ui.notify.Notifier.showError({ message: msg });
    },

    _parseError(e, defaultMessage) {
        if (typeof e === 'string') {
            return e;
        }
        if (e.message) {
            return e.message;
        }
        if (e.exception && e.error && e.error.errors && e.error.errors.length) {
            return e.error.errors[0];
        }
        if (e.exceptions && e.exceptions.length && e.exceptions[0].error) {
            return e.exceptions[0].error.statusText;
        }
        return defaultMessage;
    },

    launch: function () {
        this.loadingTimeline = false;
        Rally.data.wsapi.Proxy.superclass.timeout = 240000;
        Rally.data.wsapi.batch.Proxy.superclass.timeout = 240000;
        this.ancestorFilterPlugin = Ext.create('Utils.AncestorPiAppFilter', {
            ptype: 'UtilsAncestorPiAppFilter',
            pluginId: 'ancestorFilterPlugin',
            allowNoEntry: false,
            labelStyle: 'font-size: 14px',
            settingsConfig: {
                labelWidth: 150,
                padding: 10
            },
            listeners: {
                scope: this,
                ready: function (plugin) {
                    plugin.addListener({
                        scope: this,
                        select: function () {
                            this.onAncestorFilterChange();
                        }
                    });
                    this._kickOff();
                },
                single: true
            }
        });
        this.addPlugin(this.ancestorFilterPlugin);
    },

    initComponent: function () {
        this.callParent(arguments);
    }
});
//}());