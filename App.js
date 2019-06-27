Ext.define('CustomAgile.apps.PortfolioItemTimeline.app', {
    extend: 'Rally.app.TimeboxScopedApp',
    settingsScope: 'project',
    componentCls: 'app',
    config: {
        tlAfter: 90,  //Half a year approx
        tlBack: 120, //How many days before today.
        defaultSettings: {
            includeAncestor: true,
            //showReleases: true,
            hideArchived: true,
            //showFilter: true,
            lineSize: 40,
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
            // {
            //     name: 'showReleases',
            //     xtype: 'rallycheckboxfield',
            //     fieldLabel: 'Show Releases at top',
            //     labelAlign: 'top'
            // },
            {
                name: 'hideArchived',
                xtype: 'rallycheckboxfield',
                fieldLabel: 'Hide Archived',
                labelAlign: 'top'
            },
            // {
            //     xtype: 'rallycheckboxfield',
            //     fieldLabel: 'Show Advanced filter',
            //     name: 'showFilter',
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
            xtype: 'container',
            itemId: 'piTypeContainer',
            flex: 1,
            layout: {
                type: 'hbox',
                align: 'middle',
                defaultMargins: '0 25 10 0',
            }
        },
        {
            xtype: 'container',
            itemId: 'filterBox',
            margin: '10 0 10 0'
        },
        // {
        //     itemId: 'additionalSettingsArea',
        //     xtype: 'container',
        //     flex: 1,
        //     layout: {
        //         type: 'hbox',
        //         align: 'middle',
        //         defaultMargins: '0 10 15 0',
        //     }
        // },
        {
            xtype: 'container',
            itemId: 'rootSurface',
            id: 'rootSurface',
            padding: '10 0 5 0',
            layout: 'auto',
            width: '98%',
            title: 'Loading...',
            autoEl: { tag: 'svg' },
            listeners: { afterrender: function () { gApp = this.up('#rallyApp'); }, },
            visible: false
        }
    ],

    _nodeTree: null,

    //Continuation point after selectors ready/changed
    _redrawNodeTree: function () {
        if (gApp._nodes.length === 0) { return; }
        gApp._rowHeight = gApp.getSetting('lineSize') || 40;

        //Get all the nodes and the "Unknown" parent virtual nodes
        var nodetree = gApp._createNodeTree(gApp._nodes);
        if (!nodetree) { return; }

        gApp._setSVGDimensions(nodetree);
        gApp._startTreeAgain();
    },

    _switchChildren: function (d) {
        if (d.children) { gApp._collapse(d); }
        else { gApp._expand(d); }
        gApp._rescaledStart();
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
        if (gApp.expandables) {
            gApp.expandables.each(function (d) { gApp._collapse(d); });
        } else {
            d3.selectAll('.collapse-icon').dispatch('collapseAll');
        }
        gApp._rescaledStart();
    },

    _collapseChildren: function (d) {
        if (d && d.length) {
            _.each(d, function (c) {
                gApp._collapseChildren(c._children);
                gApp._collapse(c);
            });
        }
    },

    _expandChildren: function (d) {
        if (d && d.length) {
            _.each(d, function (c) {
                gApp._expandChildren(c._children);
                gApp._expand(c);
            });
        }
    },

    _expandAll: function () {
        gApp.setLoading(true);
        if (gApp.expandables) {
            gApp.expandables.each(function (d) {
                gApp._expandChildren(d._children);
                gApp._expand(d);

            });
            gApp._rescaledStart();
        } else {
            for (let i = 0; i < gApp._getSelectedAncestorTypeOrdinal(); i++) {
                d3.selectAll('.collapse-icon').dispatch('expandAll');
                gApp._rescaledStart();
            }
        }
        gApp.setLoading(false);
    },

    _initialiseScale: function () {
        var timebegin = new Date(Ext.Date.subtract(new Date(), Ext.Date.DAY, gApp.tlBack));
        var timeend = new Date(Ext.Date.add(new Date(), Ext.Date.DAY, gApp.tlAfter));

        // If ancestor has planned dates, set axis to them
        if (gApp._isAncestorSelected() && gApp._nodes && gApp._nodes.length) {
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
        gApp._setAxisDateFields(timebegin, timeend);
    },

    _setTimeScaler: function (timebegin, timeend) {
        gApp.dateScaler = d3.scaleTime()
            .domain([timebegin, timeend])
            .range([0, parseInt(d3.select('#rootSurface').attr('width')) - (gApp._rowHeight + 10)]);
    },

    _setAxis: function () {
        if (gApp.gX) { gApp.gX.remove(); }
        var showCalendarTicks = gApp.down('#calendarDatesCheckbox').getValue();
        var topPadding = gApp.down('#releasesCheckbox').getValue() ? 60 : 20;
        topPadding += gApp.down('#iterationsCheckbox').getValue() ? 40 : 0;
        var svg = d3.select('#rootSurface');
        var width = +svg.attr('width');
        var height = +svg.attr('height');
        gApp.xAxis = d3.axisBottom(gApp.dateScaler)
            .ticks()
            .tickSize(showCalendarTicks ? height : 0)
            .tickPadding(showCalendarTicks ? 22 - height : 22);
        gApp.gX = svg.append('g');
        gApp.gX.attr('transform', 'translate(' + gApp._rowHeight + ',0)')
            .attr('id', 'axisBox')
            .attr('width', width - (gApp._rowHeight + 10))
            .attr('height', height)
            .attr('class', 'axis')
            .call(gApp.xAxis);

        if (showCalendarTicks) {
            d3.selectAll('.tick line').attr('y1', topPadding);
        }

        if (gApp.iterations && gApp.iterations.length && gApp.down('#iterationsCheckbox').getValue()) {
            gApp.gX.selectAll('iterationticks')
                .data(gApp.iterations)
                .enter().append('line')
                .attr('x1', function (d) { return gApp.dateScaler(d.get('StartDate')); })
                .attr('y1', topPadding)
                .attr('x2', function (d) { return gApp.dateScaler(d.get('StartDate')); })
                .attr('y2', function () { return height; })
                .attr('class', 'iteration-line')
                .on('mouseover', function (d) {
                    let tipText = [
                        `Sprint: ${d.get('Name')}`,
                        `Start Date: ${Rally.util.DateTime.format(d.get('StartDate'), 'm-d-y')}`,
                        `End Date: ${Rally.util.DateTime.format(d.get('EndDate'), 'm-d-y')}`
                    ];
                    let tipId = 'tooltip-iteration-line';

                    gApp._addHoverTooltip(this, 'iteration-line-hover', tipId, tipText, 160, 60);
                })
                .on('mouseout', function (d) {
                    d3.select(this).attr('class', 'iteration-line');
                    d3.select('#tooltip-iteration-line').remove();
                });
        }

        if (gApp.down('#releasesCheckbox').getValue()) {
            gApp.gX.selectAll('releaseticks')
                .data(gApp.releases)
                .enter().append('line')
                .attr('x1', function (d) { return gApp.dateScaler(d.get('ReleaseStartDate')); })
                .attr('y1', topPadding)
                .attr('x2', function (d) { return gApp.dateScaler(d.get('ReleaseStartDate')); })
                .attr('y2', function () { return height; })
                .attr('class', 'release-line')
                .on('mouseover', function (d) {
                    let tipText = [
                        `Release: ${d.get('Name')}`,
                        `Start Date: ${Rally.util.DateTime.format(d.get('ReleaseStartDate'), 'm-d-y')}`,
                        `End Date: ${Rally.util.DateTime.format(d.get('ReleaseDate'), 'm-d-y')}`
                    ];
                    let tipId = 'tooltip-release-line'; // ${d.get('Name').replace(/\s/g, '')}

                    gApp._addHoverTooltip(this, 'release-line-hover', tipId, tipText, 160, 60);
                })
                .on('mouseout', function (d) {
                    d3.select(this).attr('class', 'release-line');
                    d3.select('#tooltip-release-line').remove();
                });
        }

        if (gApp.milestones && gApp.milestones.length && gApp.down('#milestonesCheckbox').getValue()) {
            gApp.gX.selectAll('milestoneticks')
                .data(gApp.milestones)
                .enter().append('line')
                .attr('x1', function (d) { return gApp.dateScaler(d.get('TargetDate')); })
                .attr('y1', topPadding)
                .attr('x2', function (d) { return gApp.dateScaler(d.get('TargetDate')); })
                .attr('y2', function () { return height; })
                .attr('class', 'milestone-line')
                .on('mouseover', function (d) {
                    let tipText = [
                        `${d.get('FormattedID')}: ${d.get('Name')}`,
                        `Target Date: ${Rally.util.DateTime.format(d.get('TargetDate'), 'm-d-y')}`
                    ];
                    let tipId = `${d.get('FormattedID')}-milestone-line`;

                    gApp._addHoverTooltip(this, 'milestone-line-hover', tipId, tipText, 250, 45);
                })
                .on('mouseout', function (d) {
                    d3.select(this).attr('class', 'milestone-line');
                    d3.select(`#${d.get('FormattedID')}-milestone-line`).remove();
                });
        }

        gApp.gX.append('line')
            .attr('x1', function () { return gApp.dateScaler(new Date()); })
            .attr('y1', topPadding)
            .attr('x2', function () { return gApp.dateScaler(new Date()); })
            .attr('y2', function () { return height; })
            .attr('class', 'today-line')
            .on('mouseover', function () {
                gApp._addHoverTooltip(this, 'today-line-hover', 'todayLineTooltip', ['Today'], 48, 25);
            })
            .on('mouseout', function () {
                d3.select(this).attr('class', 'today-line');
                d3.select('#todayLineTooltip').remove();
            });

    },

    _addHoverTooltip: function (hoverEl, hoverElClass, tipId, tipText, width, height) {
        let coords = d3.mouse(hoverEl);
        let tooltip = d3.select('#rootSurface').append('g')
            .attr('id', tipId)
            .attr('class', 'timeline-tooltip')
            .attr('transform', `translate(${coords[0] + 55},${coords[1]})`);

        tooltip.append('rect')
            .attr('width', width)
            .attr('height', height)
            .attr('rx', 7)
            .attr('ry', 7);

        let textObj = tooltip.append('text')
            .attr('x', 5)
            .attr('y', 2)
            .text('');

        _.each(tipText, function (newLine) {
            textObj.append('tspan')
                .attr('x', 7)
                .attr('dy', '1.3em')
                .text(newLine);
        });

        d3.select(hoverEl).attr('class', hoverElClass);
    },


    _setAxisDateFields: function (start, end) {
        if (end < start) {
            Rally.ui.notify.Notifier.showError({ message: 'End date must be greater than start date' });
            return;
        }

        var startDateField = gApp.down('#axisStartDate');
        var endDateField = gApp.down('#axisEndDate');

        startDateField.suspendEvents(false);
        endDateField.suspendEvents(false);

        startDateField.setValue(start);
        endDateField.setValue(end);

        startDateField.resumeEvents();
        endDateField.resumeEvents();

        gApp._setTimeScaler(start, end);
        gApp._rescaledStart();
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

    _zoomedStart: function () {
        gApp.down('#zoomInBtn').setDisabled(Rally.util.DateTime.getDifference(gApp.down('#axisEndDate').getValue(), gApp.down('#axisStartDate').getValue(), 'day') < 30);
        gApp._removeSVGTree();
        gApp._addSVGTree();
        gApp._refreshTree();
    },

    _rescaledStart: function () {
        gApp._zoomedStart();
        gApp._setAxis();
    },

    _startTreeAgain: function () {
        gApp._initialiseScale();
        gApp._rescaledStart();
    },

    _zoom: function (zoomIn) {
        var axisStart = gApp.down('#axisStartDate');
        var startDate = axisStart.getValue();
        var axisEnd = gApp.down('#axisEndDate');
        var endDate = axisEnd.getValue();
        var zoomDays = 14;

        if (zoomIn) {
            startDate = Ext.Date.add(startDate, Ext.Date.DAY, zoomDays);
            endDate = Ext.Date.subtract(endDate, Ext.Date.DAY, zoomDays);
        }
        else {
            startDate = Ext.Date.subtract(startDate, Ext.Date.DAY, zoomDays);
            endDate = Ext.Date.add(endDate, Ext.Date.DAY, zoomDays);
        }

        if (startDate < endDate || !zoomIn) {
            if (Rally.util.DateTime.getDifference(endDate, startDate, 'day') < (zoomDays * 2)) {
                gApp.down('#zoomInBtn').setDisabled(false);
            }

            gApp._setAxisDateFields(startDate, endDate);
        }
    },

    _setTimeline: function (d) {
        var start = d.data.record.get('PlannedStartDate');
        var end = d.data.record.get('PlannedEndDate');

        gApp._setAxisDateFields(start, end);
    },

    _getSVGHeight: function () {
        return parseInt(d3.select('#rootSurface').attr('height')) - gApp._rowHeight;
    },

    _setSVGDimensions: function (nodetree) {
        var svg = d3.select('#rootSurface');
        svg.attr('height', gApp._rowHeight * (nodetree.value + 1 + (gApp.down('#releasesCheckbox').getValue() ? 1 : 0) + (gApp.down('#iterationsCheckbox').getValue() ? 1 : 0)));
        //Make surface the size available in the viewport (minus the selectors and margins)
        var rs = gApp.down('#rootSurface');
        rs.getEl().setHeight(svg.attr('height'));
        svg.attr('width', rs.getEl().getWidth());
        svg.attr('class', 'rootSurface');
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

    _initIterationTranslate: function (d) {
        d.startX = new Date(d.get('StartDate'));
        d.endX = new Date(d.get('EndDate'));

        var x = gApp.dateScaler(d.startX);
        var e = gApp.dateScaler(d.endX);

        d.drawnX = x;
        d.drawnY = -gApp._rowHeight / 1.5;
        d.drawnWidth = e - d.drawnX;
        d.drawnWidth = d.drawnWidth < 0 ? 0 : d.drawnWidth;
        d.translate = "translate(" + d.drawnX + "," + d.drawnY + ")";
    },

    _initReleaseTranslate: function (d) {
        d.startX = new Date(d.get('ReleaseStartDate'));
        d.endX = new Date(d.get('ReleaseDate'));

        var x = gApp.dateScaler(d.startX);
        var e = gApp.dateScaler(d.endX);

        d.drawnX = x;
        d.drawnY = -(gApp._rowHeight / 1.5) - (gApp.down('#iterationsCheckbox').getValue() ? gApp._rowHeight / 1.5 : 0);
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

        d.plannedDrawnX = plannedX;
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
        gApp._nodeTree.sum(function () { return 1; });
        var partition = d3.partition();
        var nodetree = partition(gApp._nodeTree);

        gApp._setSVGDimensions(nodetree);

        // Expand / Collapse all
        d3.select('#zoomTree').selectAll('.expandAll')
            .data(gApp.expandData)
            .enter().append('g')
            .append('text')
            .attr('x', -20)
            .attr('y', -15 - (gApp.down('#releasesCheckbox').getValue() ? gApp._rowHeight / 1.5 : 0) - (gApp.down('#iterationsCheckbox').getValue() ? gApp._rowHeight / 1.5 : 0))
            .attr('class', function (d) { return 'icon-gear app-menu ' + (d.expanded ? 'collapse-arrow' : 'expand-arrow'); })
            .attr('alignment-baseline', 'central')
            .text(function (d) { return d.expanded ? '9' : '7'; })
            .on('click', function (d) {
                d.expanded = !d.expanded;
                if (!d.expanded) { gApp._collapseAll(); } else { gApp._expandAll(); }
            });

        if (gApp.down('#releasesCheckbox').getValue()) {
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
                .attr('x', function (d) { return d.drawnWidth / 2 - (d.get('Name').length * 2); })
                .attr('y', gApp._rowHeight / 4 + 3)
                .text(function (d) { return d.get('Name'); });

        }

        if (gApp.down('#iterationsCheckbox').getValue()) {
            var iterations = d3.select('#zoomTree').selectAll(".iterationNode")
                .data(gApp.iterations)
                .enter().append("g")
                .attr('class', 'iterationNode')
                .attr('id', function (d) { return 'iteration-' + d.get('Name'); })
                .attr('transform', function (d) {
                    gApp._initIterationTranslate(d);
                    return d.translate;
                });

            // Release bars
            iterations.append('rect')
                .attr('width', function (d) { return d.drawnWidth; })
                .attr('height', gApp._rowHeight / 2)
                .attr('fill', '#f2f2f2')
                .attr('stroke', '#808080')
                .attr('stroke-opacity', 0.5);

            // Release Name
            iterations.append('text')
                .attr('x', function (d) { return d.drawnWidth / 2 - (d.get('Name').length * 2); })
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
            .attr('rx', gApp._rowHeight / 6)
            .attr('ry', gApp._rowHeight / 6)
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
            .attr('x', function (d) { return 5 - d.plannedDrawnX + (d.depth * 5); })
            .attr('alignment-baseline', 'central')
            .text('V')
            .attr('class', function (d) {
                var lClass = 'icon-gear app-menu';
                // if (!d.data.record.get('PlannedStartDate') || !d.data.record.get('PlannedEndDate')) {
                //     lClass += ' error';
                // }
                return lClass;
            })
            .on('click', function (d) { gApp._itemMenu(d); });

        // hamburgers.append('span')
        //     .attr('class', 'tooltiptext')
        //     .text(function (d) { return 'Edit ' + d.data.record.get('FormattedID'); });

        // PI ID and Name text
        plannedRows.append('text')
            .attr('id', function (d) { return 'text-' + d.data.Name; })
            .attr('x', function (d) { return symbolWidth + 5 - d.plannedDrawnX + (d.depth * 5); })
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
        gApp.expandables = d3.selectAll('.children').append('text')
            .attr('x', function (d) { return -(symbolWidth + d.plannedDrawnX) + (d.depth * 5); })
            .attr('y', gApp._rowHeight / 4)
            .attr('class', function (d) { return 'icon-gear app-menu collapse-icon ' + (d.children ? 'collapse-arrow' : 'expand-arrow'); })
            .attr('alignment-baseline', 'central')
            .text(function (d) { return d.children ? '9' : '7'; })
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

    _onAncestorFilterChange: function () {
        gApp._updateAncestorTabText();
        gApp._refreshTimeline();
    },

    // onSharedViewChange: function (whatami) {
    //     debugger;
    // },

    onTimeboxScopeChange: function (newTimebox) {
        this.callParent(arguments);
        gApp.timeboxScope = newTimebox;
        gApp._refreshTimeline();
    },

    _onFilterChange: function (filters) {
        gApp.advFilters = filters;
        gApp._updateFilterTabText();

        // If user clears filters, update timeline, otherwise store the added filter
        if (gApp._hasFilters()) { gApp.down('#applyFiltersBtn').setDisabled(false); }
        else { gApp._applyFilters(gApp.down('#applyFiltersBtn')); }
    },

    _onTopLevelPIChange: function () {
        gApp._refreshTimeline();
    },

    _onScopeChange: function () {
        gApp._refreshTimeline();
    },

    _updateFilterTabText: function () {
        var totalFilters = 0;
        _.each(gApp.advFilters, function (filter) {
            totalFilters += filter.length;
        });

        var titleText = totalFilters ? `FILTERS (${totalFilters})` : 'FILTERS';
        var tab = gApp.tabPanel.child('#chartFiltersTab');

        if (tab) { tab.setTitle(titleText); }
    },

    _updateAncestorTabText: function () {
        var titleText = gApp._isAncestorSelected() ? 'ANCESTOR CHOOSER (*)' : 'ANCESTOR CHOOSER';
        var tab = gApp.tabPanel.child(`#${Utils.AncestorPiAppFilter.RENDER_AREA_ID}`);

        if (tab) { tab.setTitle(titleText); }
    },

    _hasFilters: function () {
        if (!gApp.advFilters) { return false; }

        var hasFilters = false;

        _.each(gApp.advFilters, function (filter) {
            if (filter.length) {
                hasFilters = true;
            }
        });

        return hasFilters;
    },

    _onTypeChange: function () {
        gApp._refreshTimeline();
    },

    _onGridlinesChanged() {
        if (gApp.ready) {
            gApp._setAxis();
        }
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

    _refreshTimeline: async function () {
        // TODO: this is kind of a hack for dealing with multiple 'select' listeners
        // You should fix this later
        if (gApp.loadingTimeline || !gApp.ready) { return; }

        if (gApp.ancestorFilterPlugin.piSelector) {
            gApp.ancestorFilterPlugin.piSelector.queryDelay = 1250;
        }

        gApp._removeSVGTree();
        gApp._clearNodes();

        // Reset height so the loading mask shows properly
        var rs = gApp.down('#rootSurface');
        rs.getEl().setHeight(300);

        gApp.setLoading('Loading portfolio items...');
        gApp.loadingTimeline = true;

        await gApp._getDefaultProjectID();

        if (!gApp.releases) {
            await gApp._getReleases();
        }

        if (!gApp.iterations) {
            await gApp._getIterations();
        }

        if (!gApp.milestones) {
            await gApp._getMilestones();
        }

        new Promise(function (resolve, reject) {
            if (gApp._isAncestorSelected()) {

                // Ancestor plugin gives us the ref and typepath, so we need to fetch
                // the actual record before proceeding
                var piData = gApp.ancestorFilterPlugin._getValue();
                gApp._fetchRecordByRef(piData, function (store, records, success) {
                    if (success) {
                        if (records && records.length) {
                            gApp.loadingTimeline = true;
                            records[0].id = 'root';
                            gApp.expandData[0].expanded = true;
                            gApp._getArtifactsFromRoot(records, resolve, reject);
                        }
                        else { reject('Failed to retrieve selected portfolio item. Please reload and try again.'); }
                    }
                    else { reject('Failed to retrieve selected portfolio item. Please reload and try again.'); }
                });
            }
            // No ancestor selected, load all PIs starting at selected type
            else {
                var topType = gApp._getSelectedAncestorType();
                if (topType) {
                    gApp.expandData[0].expanded = false;
                    gApp._getArtifacts(topType, resolve, reject);
                }
                else { reject("Failed while fetching portfolio items. Couldn't load ancestor type."); }
            }
        }).then(
            // RESOLVE
            function () {
                gApp._removeChildlessNodes();
                gApp._redrawNodeTree();
                if (!gApp._isAncestorSelected()) { gApp._collapseAll(); }
            },
            // REJECT
            function (error) {
                gApp._showError(gApp._parseError(error, 'Failed while fetching portfolio items. Please reload and try again.'));
            }
        ).finally(function () {
            gApp.setLoading(false);
            gApp.loadingTimeline = false;
        });
    },

    _kickOff: function () {
        // variable to bind to the expand/collapse all button on timeline
        gApp.expandData = [{ expanded: true }];

        gApp._typeStore = gApp.ancestorFilterPlugin.portfolioItemTypes;

        var childTypes = gApp._getTypeList(gApp._highestOrdinal() - 1);
        var childModels = [];
        _.each(childTypes, function (model) { childModels.push(model.Type); });

        var fontStyle = 'font-size: 13px; font-family:ProximaNova,Helvetica,Arial';

        gApp.tabPanel.child('#chartControlsTab').add(
            {
                xtype: 'container',
                layout: {
                    type: 'hbox',
                    align: 'middle',
                    padding: 10,
                    defaultMargins: '0 30 15 0'
                },
                items: [
                    {
                        xtype: 'panel',
                        title: 'Axis Dates',
                        titleAlign: 'center',
                        titleCollapse: true,
                        collapsible: true,
                        collapsed: true,
                        border: false,
                        width: 180,
                        layout: {
                            type: 'vbox'
                        },
                        items: [
                            {
                                xtype: 'rallydatefield',
                                fieldLabel: 'Start',
                                labelSeparator: '',
                                value: new Date(),
                                itemId: 'axisStartDate',
                                labelStyle: fontStyle + '; margin-right: 0;',
                                labelWidth: 40,
                                margin: 5,
                                validateOnChange: true,
                                listeners: { aftervalidate: gApp._onAxisDateChange }
                            },
                            {
                                xtype: 'rallydatefield',
                                fieldLabel: 'End',
                                labelSeparator: '',
                                value: new Date(),
                                itemId: 'axisEndDate',
                                labelStyle: fontStyle + '; margin-right: 0;',
                                labelWidth: 40,
                                margin: 5,
                                validateOnChange: true,
                                listeners: { aftervalidate: gApp._onAxisDateChange }
                            }
                        ]
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
                                text: 'ZOOM',
                                style: fontStyle,
                                width: 50,
                                margin: '0 5 0 0',
                                itemId: 'zoomLabel'
                            },
                            {
                                xtype: 'rallybutton',
                                itemId: 'zoomOutBtn',
                                id: 'zoomOutBtn',
                                margin: '0 10 0 0',
                                iconCls: 'icon-collapse',
                                handler: function () { gApp._zoom(false); }
                            },
                            {
                                xtype: 'rallybutton',
                                itemId: 'zoomInBtn',
                                id: 'zoomInBtn',
                                iconCls: 'icon-expand',
                                margin: 0,
                                handler: function () { gApp._zoom(true); }
                            }
                        ]
                    },
                    {
                        xtype: 'panel',
                        title: 'GRIDLINES & OVERLAYS',
                        titleAlign: 'center',
                        titleCollapse: true,
                        collapsible: true,
                        collapsed: true,
                        border: false,
                        width: 220,
                        layout: {
                            type: 'hbox'
                        },
                        items: [
                            {
                                xtype: 'fieldcontainer',
                                layout: {
                                    type: 'vbox'
                                },
                                labelStyle: fontStyle,
                                labelSeparator: '',
                                labelWidth: 0,
                                width: 95,
                                margin: 5,
                                defaultType: 'checkboxfield',
                                border: 0,
                                items: [
                                    {
                                        boxLabel: 'Calendar dates',
                                        itemId: 'calendarDatesCheckbox',
                                        name: 'overlayCheckboxes',
                                        inputValue: true,
                                        checked: true,
                                        id: 'calendarDatesCheckbox',
                                        handler: gApp._setAxis,
                                        stateful: true,
                                        stateId: gApp.getContext().getScopedStateId('CustomAgile.PortfolioItemTimeline.showCalendarDateOverlays'),
                                        stateEvents: ['change'],
                                    },
                                    {
                                        boxLabel: 'Iterations',
                                        itemId: 'iterationsCheckbox',
                                        name: 'overlayCheckboxes',
                                        inputValue: true,
                                        // checked: false,
                                        id: 'iterationsCheckbox',
                                        handler: gApp._rescaledStart,
                                        stateful: true,
                                        stateId: gApp.getContext().getScopedStateId('CustomAgile.PortfolioItemTimeline.showIterationOverlays'),
                                        stateEvents: ['change'],
                                    },
                                    {
                                        boxLabel: 'Releases',
                                        itemId: 'releasesCheckbox',
                                        name: 'overlayCheckboxes',
                                        inputValue: true,
                                        //checked: false,
                                        id: 'releasesCheckbox',
                                        handler: gApp._rescaledStart,
                                        stateful: true,
                                        stateId: gApp.getContext().getScopedStateId('CustomAgile.PortfolioItemTimeline.showReleaseOverlays'),
                                        stateEvents: ['change'],
                                    }
                                ]
                            },
                            {
                                xtype: 'fieldcontainer',
                                fieldLabel: '',
                                layout: {
                                    type: 'vbox'
                                },
                                labelStyle: fontStyle,
                                labelSeparator: '',
                                labelWidth: 0,
                                width: 90,
                                margin: 5,
                                defaultType: 'checkboxfield',
                                border: 0,
                                items: [
                                    {
                                        boxLabel: 'Milestones',
                                        itemId: 'milestonesCheckbox',
                                        name: 'overlayCheckboxes',
                                        inputValue: true,
                                        //checked: false,
                                        id: 'milestonesCheckbox',
                                        handler: gApp._setAxis,
                                        stateful: true,
                                        stateId: gApp.getContext().getScopedStateId('CustomAgile.PortfolioItemTimeline.showMilestoneOverlays'),
                                        stateEvents: ['change'],
                                    },
                                    {
                                        boxLabel: 'Dependencies',
                                        itemId: 'showDependenciesCheckbox',
                                        name: 'overlayCheckboxes',
                                        inputValue: true,
                                        //checked: false,
                                        id: 'showDependenciesCheckbox',
                                        handler: gApp._setAxis,
                                        stateful: true,
                                        stateId: gApp.getContext().getScopedStateId('CustomAgile.PortfolioItemTimeline.showDependencyOverlays'),
                                        stateEvents: ['change'],
                                    }
                                ]
                            }
                        ]
                    },
                    {
                        xtype: 'text',
                        text: 'EXPORT',
                        style: fontStyle,
                        width: 50,
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
                ]
            });

        gApp.ready = true;
        gApp._updateFilterTabText();
        gApp._updateAncestorTabText();
        gApp._refreshTimeline();
    },

    _buildConfig: function (type, parentRecords) {
        var dataContext = gApp.getContext().getDataContext();
        var typePath = type.get('TypePath');
        var currentFilter = gApp.advFilters && gApp.advFilters[typePath];
        var scopeAllProjects = gApp.down('#scopeCombobox').getValue();
        var topLevelTypePath = gApp.down('#piTypeCombobox').getValue();

        // If scoping is set to all projects and we're retrieving the top level PIs
        // we should limit to results 300 for performance
        var pagesize = (scopeAllProjects && typePath === topLevelTypePath) ? 75 : 1200;

        var config = {
            model: typePath,
            sorters: [{
                property: 'DragAndDropRank',
                direction: 'ASC'
            }],
            pageSize: pagesize,
            limit: pagesize,
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

        if (!scopeAllProjects && typePath === topLevelTypePath) {
            // Keep project scoping
        }
        else {
            dataContext.project = null;
        }

        if (currentFilter && currentFilter.length) {
            Ext.Array.each(currentFilter, function (filter) {
                config.filters.push(filter);
            });

            // Can only do releases and milestones, not iterations
            // if ((gApp.timeboxScope && gApp.timeboxScope.type.toLowerCase() === 'release') ||
            //     (gApp.timeboxScope && gApp.timeboxScope.type.toLowerCase() === 'milestone')
            // ) {
            //     config.filters.push(gApp.timeboxScope.getQueryFilter());
            // }
        }

        // Parents have been filtered so we only want children underneath those
        // parents that were returned to avoid breaking the tree
        if (parentRecords) {
            config.enablePostGet = true;

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
                config.filters.push(gApp.ancestorFilterPlugin.getFilterForType(typePath));
            }
        }

        config.context = dataContext;

        return Ext.clone(config);
    },

    _getArtifactsFromRoot: function (records, resolve, reject) {
        if (records.length) {
            gApp._nodes = gApp._nodes.concat(gApp._createNodes(records));
            gApp.setLoading(`Loading portfolio items... (${gApp._nodes.length} fetched so far)`);
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
                catch (e) { reject(e); }
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
                        if (!results.length) {
                            reject(`No Portfolio Items of type ${topType.get('Name')} found within this project (or selected scoping)`);
                            return;
                        }
                        else {
                            _.forEach(results, function (record) {
                                record.data.Parent = { '_ref': 'root', ObjectID: 'root' };
                            });
                            if (results.length < 5) {
                                gApp._getArtifactsFromRoot(results, resolve, reject);
                            } else {
                                let promises = [];
                                while (results.length) {
                                    promises.push(new Promise(function (newResolve, newReject) {
                                        if (results.length >= 4) {
                                            gApp._getArtifactsFromRoot(results.splice(0, 4), newResolve, newReject);
                                        } else {
                                            gApp._getArtifactsFromRoot(results.splice(0, results.length), newResolve, newReject);
                                        }
                                    }));
                                }
                                Promise.all(promises).then(resolve, function (e) { reject(e); });
                            }
                        }
                    },
                    failure: function (error) { reject(error); },
                    scope: this
                });
        }
        catch (e) { reject(e); }
    },

    // Since we're filtering on a specific PI type, we want to scan through all types above the
    // lowest filtered type and remove PIs that have no children so the end user has a cleaner view 
    // of PIs that they care about
    _removeChildlessNodes: function () {
        if (!gApp._nodes || !gApp._hasFilters()) { return; }

        var toDelete = true;
        var currentOrd = gApp._getLowestFilteredOrdinal();
        if (currentOrd === 0) { currentOrd++; }
        var maxOrd = gApp._getSelectedAncestorTypeOrdinal() - (gApp._isAncestorSelected() ? 1 : 0);
        while (currentOrd <= maxOrd) {
            _.each(gApp._nodes, function (currentNode) {
                if (currentNode.Name !== 'root' && currentNode.record.id !== 'root' && currentNode.record.get('PortfolioItemType').Ordinal === currentOrd) {
                    for (let isChildNode of gApp._nodes) {
                        if (isChildNode.Name !== 'root' && isChildNode.record.id !== 'root' && isChildNode.record.get('Parent').ObjectID === currentNode.record.get('ObjectID') && !isChildNode.toDelete) {
                            toDelete = false;
                            break;
                        }
                    }
                    currentNode.toDelete = toDelete;
                    toDelete = true;
                }
            });
            currentOrd++;
        }

        gApp._nodes = _.filter(gApp._nodes, function (currentNode) {
            return !currentNode.toDelete;
        });
    },

    _getDefaultProjectID: async function () {
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

        gApp.defaultProjectID = projectID;

        return projectID;
    },

    _getReleases: async function () {
        try {
            gApp.releases = await gApp._getTimebox('Release', ['Name', 'ReleaseStartDate', 'ReleaseDate']);
        } catch (e) {
            gApp.releases = [];
            Rally.ui.notify.Notifier.showError({ message: 'Error while fetching releases' });
        }
    },

    _getIterations: async function () {
        try {
            gApp.iterations = await gApp._getTimebox('Iteration', ['Name', 'StartDate', 'EndDate']);
        } catch (e) {
            gApp.iterations = [];
            Rally.ui.notify.Notifier.showError({ message: 'Error while fetching iterations' });
        }
    },

    _getMilestones: async function () {
        try {
            let filter = [{
                property: 'Projects',
                operator: 'contains',
                value: gApp.getContext().getProjectRef()
            }];
            gApp.milestones = await gApp._getTimebox('Milestone', ['Name', 'FormattedID', 'TargetDate'], filter);
        } catch (e) {
            gApp.milestones = [];
            Rally.ui.notify.Notifier.showError({ message: 'Error while fetching milestones' });
        }
    },

    _getTimebox: async function (modelName, fetchItems, filter) {
        var projectID = gApp.defaultProjectID || await gApp._getDefaultProjectID();
        var storeFilter = filter || [{
            property: 'Project.ObjectID',
            operator: '=',
            value: projectID
        }];

        return new Promise(function (resolve, reject) {
            Ext.create('Rally.data.wsapi.Store', {
                model: modelName,
                autoLoad: true,
                limit: Infinity,
                fetch: fetchItems,
                filters: storeFilter,
                context: {
                    project: null,
                    projectScopeDown: false,
                    projectScopeUp: false
                },
                listeners: {
                    load: function (store, records, success) {
                        if (success) {
                            resolve(records);
                        }
                        else { reject(new Error()); }
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
        return gApp.down('#piTypeCombobox').getValue();
        //return gApp.ancestorFilterPlugin._getValue().piTypePath;
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

    _getLowestFilteredOrdinal() {
        var lowestOrd = gApp._highestOrdinal();
        if (gApp.advFilters) {
            _.each(gApp.advFilters, function (filter, key) {
                if (filter.length) {
                    let ord = gApp._getOrdFromModel(key);
                    if (ord !== null && ord < lowestOrd) {
                        lowestOrd = ord;
                    }
                }
            });
        }

        return lowestOrd;
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
            gApp._nodeTree = gApp._stratifyNodeTree(nodes)
                .sum(function (d) { return 1; });        // Set the dimensions in svg to match
            //gApp._nodeTree = nodetree;      //Save for later
            return gApp._nodeTree;
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
            .attr("transform", "translate(" + gApp._rowHeight + "," + (gApp._rowHeight + (gApp.down('#releasesCheckbox').getValue() ? gApp._rowHeight / 1.5 : 0) + (gApp.down('#iterationsCheckbox').getValue() ? gApp._rowHeight / 1.5 : 0)) + ")")
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
        if (typeof e === 'string' && e.length) {
            return e;
        }
        if (e.message && e.message.length) {
            return e.message;
        }
        if (e.exception && e.error && e.error.errors && e.error.errors.length) {
            if (e.error.errors[0].length) {
                return e.error.errors[0];
            } else {
                if (e.error && e.error.response && e.error.response.status) {
                    return `${defaultMessage} (Status ${e.error.response.status})`;
                }
            }
        }
        if (e.exceptions && e.exceptions.length && e.exceptions[0].error) {
            return e.exceptions[0].error.statusText;
        }
        return defaultMessage;
    },

    _addAncestorPlugin: function () {
        gApp.ancestorFilterPlugin = Ext.create('Utils.AncestorPiAppFilter', {
            ptype: 'UtilsAncestorPiAppFilter',
            pluginId: 'ancestorFilterPlugin',
            allowNoEntry: false,
            labelStyle: 'font-size: 14px',
            ownerLabel: '',
            ownerLabelWidth: 0,
            settingsConfig: {
                labelWidth: 150,
                padding: 10
            },
            listeners: {
                scope: gApp,
                ready: function (plugin) {
                    plugin.addListener({
                        scope: gApp,
                        select: function () {
                            gApp._onAncestorFilterChange();
                        }
                    });
                    gApp.ancestorFilterPlugin.renderArea.down('#ignoreScopeControl').hide();
                    gApp._addMultiLevelFilterPlugin();
                },
                single: true
            }
        });
        gApp.addPlugin(gApp.ancestorFilterPlugin);
    },

    _addMultiLevelFilterPlugin: function () {
        // Button to apply filters
        gApp.down('#chartFiltersTab').add([

            {
                xtype: 'container',
                itemId: 'chartFilterButtonArea',
                margin: 5,
                layout: {
                    type: 'hbox',
                    align: 'middle',
                    defaultMargins: '0 15 15 0'
                },
                items: [
                    {
                        xtype: 'rallybutton',
                        itemId: 'applyFiltersBtn',
                        handler: gApp._applyFilters,
                        text: 'Apply filters to timeline',
                        cls: 'apply-filters-button',
                        disabled: true
                    }
                ]
            },
            {
                xtype: 'container',
                itemId: 'chartFilterPanelArea',
                margin: 5,
                layout: {
                    type: 'hbox'
                }
            }
        ]);

        //let filterHelp = document.getElementById('filter-help-icon');
        // Ext.create('Rally.ui.tooltip.ToolTip', {
        //     target: 'filter-help-icon',
        //     html: '<div><p>After setting all of your desired filters, click the green button to apply the filters and refresh the timeline. Clicking the "Clear All" button will automatically remove all filters and refresh the timeline</p><p>When filters are active, the timeline will remove all portfolio items that have no children (excluding the lowest level PI), starting from the lowest filtered portfolio item type and working up the hierarchy.</p><p>Example: If you filter by feature owner, then all epics without any features fitting the filter criteria will not show on the timeline.</p></div>',
        //     itemId: 'filterTip',
        //     id: 'filterTip',
        //     showDelay: 200,
        //     // style: {
        //     //     'z-index': 1500
        //     // },
        //     hideDelay: 500000
        // });

        gApp.multiLevelFilterPlugin = Ext.create('Utils.MultiLevelPiAppFilter', {
            ptype: 'UtilsMultiLevelPiAppFilter',
            pluginId: 'multiLevelFilterPlugin',
            btnRenderAreaId: 'chartFilterButtonArea',
            panelRenderAreaId: 'chartFilterPanelArea',
            filtersHidden: false,
            listeners: {
                scope: gApp,
                ready: function (plugin) {
                    plugin.addListener({
                        scope: gApp,
                        change: gApp._onFilterChange
                    });

                    gApp.advFilters = plugin.getFilters();
                    gApp.multiLevelFilterPlugin.showFiltersBtn.hide();

                    gApp._kickOff();
                },
                single: true
            }
        });
        gApp.addPlugin(gApp.multiLevelFilterPlugin);
    },

    launch: function () {
        gApp.ready = false;
        gApp.loadingTimeline = false;
        Rally.data.wsapi.Proxy.superclass.timeout = 240000;
        Rally.data.wsapi.batch.Proxy.superclass.timeout = 240000;

        gApp.down('#piTypeContainer').add([
            {
                xtype: 'rallyportfolioitemtypecombobox',
                itemId: 'piTypeCombobox',
                stateful: true,
                stateId: gApp.getContext().getScopedStateId('CustomAgile.PortfolioItemTimeline.topLevelPIType'),
                stateEvents: ['select'],
                fieldLabel: 'Top level PI type',
                labelStyle: 'font-size: 14px',
                labelWidth: 115,
                valueField: 'TypePath',
                allowNoEntry: false,
                defaultSelectionPosition: 'first',
                listeners: {
                    scope: gApp,
                    change: function () {
                        gApp._onTopLevelPIChange();
                    }
                },
            },
            {
                xtype: 'rallycombobox',
                itemId: 'scopeCombobox',
                stateful: true,
                stateId: gApp.getContext().getScopedStateId('CustomAgile.PortfolioItemTimeline.projectScopeControl'),
                stateEvents: ['select'],
                displayField: 'text',
                valueField: 'value',
                fieldLabel: 'Scope ',
                afterLabelTextTpl: "<span id='scope-help-icon' style='font-size:12px' class='icon-help'> </span>",
                labelStyle: 'font-size: 14px',
                labelWidth: 60,
                storeConfig: {
                    fields: ['text', 'value'],
                    data: [{
                        text: "Current Project(s)",
                        value: false
                    }, {
                        text: "Any Project",
                        value: true
                    }]
                },
                listeners: {
                    scope: this,
                    change: function () {
                        gApp._onScopeChange();
                    },
                    afterrender: function (tooltip) {
                        Ext.create('Rally.ui.tooltip.ToolTip', {
                            target: (tooltip.labelEl && tooltip.labelEl.dom.children.length && tooltip.labelEl.dom.children[0]) || tooltip.labelEl,
                            html: '<div>When scoping across all projects, top level results limited to 75 rows</div>',
                            itemId: 'scopeTip',
                            id: 'scopeTip',
                            showDelay: 200
                        });
                    }
                },
            }
        ]);

        gApp.tabPanel = gApp.down('#filterBox').add(
            {
                xtype: 'tabpanel',
                activeTab: 0,
                plain: true,
                autoRender: true,
                minTabWidth: 140,
                items: [
                    {
                        title: 'Chart Controls',
                        html: '',
                        itemId: 'chartControlsTab'
                    },
                    {
                        title: 'Filters',
                        html: '',
                        itemId: 'chartFiltersTab',
                        padding: 0,
                        // tabConfig: {
                        //     tooltip: '<div><p>After setting all of your desired filters, click the green button to apply the filters and refresh the timeline. Clicking the "Clear All" button will automatically remove all filters and refresh the timeline</p><p>When filters are active, the timeline will remove all portfolio items that have no children (excluding the lowest level PI), starting from the lowest filtered portfolio item type and working up the hierarchy.</p><p>Example: If you filter by feature owner, then all epics without any features fitting the filter criteria will not show on the timeline.</p></div>'
                        // },
                        // iconCls: 'icon-help'
                    },
                    {
                        title: 'Ancestor Chooser',
                        html: '',
                        itemId: Utils.AncestorPiAppFilter.RENDER_AREA_ID,
                        padding: 10,
                        minHeight: 80
                    }
                ]
            });

        gApp._addAncestorPlugin();

        // {
        //     xtype: 'component',
        //     id: 'filter-help-icon',
        //     itemId: 'filter-help-icon',
        //     html: "<span id='filter-help-icon-span' class='icon-help'> </span>",
        //     // style: {
        //     //     'z-index': 1000
        //     // }
        // },



        //var context = this.getContext();
        // this.sharedViewPlugin = Ext.create('Rally.ui.gridboard.plugin.GridBoardSharedViewControl', {
        //     ptype: 'rallygridboardsharedviewcontrol',
        //     pluginId: 'timelineSharedViewPlugin',
        //     sharedViewConfig: {
        //         itemId: 'sharedViewCombobox',
        //         context: context,
        //         stateful: true,
        //         stateId: context.getScopedStateId('custom-timeline-shared-views'),
        //         stateEvents: ['select'],
        //         defaultViews: [],
        //         enableUrlSharing: true,
        //         allowNoEntry: true,
        //         listeners: {
        //             scope: this,
        //             ready: function (plugin) {
        //                 plugin.addListener({
        //                     scope: this,
        //                     select: this.onSharedViewChange
        //                 });
        //             },
        //             single: true
        //         },
        //         renderTo: Ext.getBody()
        //     }

        // });
        // this.addPlugin(this.sharedViewPlugin);
    },

    initComponent: function () {
        this.callParent(arguments);
    }
});