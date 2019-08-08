Ext.define('CustomAgile.apps.PortfolioItemTimeline.app', {
    extend: 'Rally.app.TimeboxScopedApp',
    settingsScope: 'project',
    componentCls: 'app',
    config: {
        tlAfter: 90,  // Default days past today for viewport end
        tlBack: 120, // Default days before today for viewport start
        viewportDays: 210,
        zoomFactor: 0.35, // Multiplier for calculating how much to zoom in and out
        maxZoom: 60, // Number of days to display across viewport before disabling zooming in
        tlStart: null, // To be set to earliest planned or actual start date in timeline
        tlEnd: null, // To be set to latest planned or actual end date in timeline
        defaultSettings: {
            hideArchived: true,
            lineSize: 40,
            cardHover: true,
            calendarOverlay: true,
            iterationOverlay: false,
            releaseOverlay: true,
            calendarGridlines: false,
            iterationGridlines: false,
            releaseGridlines: true,
            milestoneGridlines: false,
            dependencyStrings: false,
            todayGridline: true
        }
    },

    colours: ['#f2f0f7', '#dadaeb', '#bcbddc', '#9e9ac8', '#756bb1', '#54278f'],

    getSettingsFields: function () {
        var returned = [
            {
                name: 'hideArchived',
                xtype: 'rallycheckboxfield',
                fieldLabel: 'Hide Archived',
                labelAlign: 'left',
                width: 225,
                labelWidth: 200
            },
            {
                xtype: 'rallycheckboxfield',
                fieldLabel: 'Allow card pop-up on hover',
                name: 'cardHover',
                labelAlign: 'left',
                width: 225,
                labelWidth: 200
            },
            {
                xtype: 'rallynumberfield',
                fieldLabel: 'Grid bar width',
                name: 'lineSize',
                minValue: 15,
                labelAlign: 'left',
                width: 350,
                labelWidth: 200
            },
            {
                xtype: 'text',
                text: 'Default Overlays & Gridlines:',
                margin: '20 0 10 0',
                style: 'font-size:12px;',
                width: 225,
                labelWidth: 200
            },
            {
                name: 'calendarOverlay',
                xtype: 'rallycheckboxfield',
                fieldLabel: 'Axis Dates',
                labelAlign: 'left',
                width: 225,
                labelWidth: 200
            },
            {
                name: 'iterationOverlay',
                xtype: 'rallycheckboxfield',
                fieldLabel: 'Iteration Overlay',
                labelAlign: 'left',
                width: 225,
                labelWidth: 200
            },
            {
                name: 'releaseOverlay',
                xtype: 'rallycheckboxfield',
                fieldLabel: 'Release Overlay',
                labelAlign: 'left',
                width: 225,
                labelWidth: 200
            },
            {
                name: 'calendarGridlines',
                xtype: 'rallycheckboxfield',
                fieldLabel: 'Date Gridlines',
                labelAlign: 'left',
                width: 225,
                labelWidth: 200
            },
            {
                name: 'iterationGridlines',
                xtype: 'rallycheckboxfield',
                fieldLabel: 'Iteration Gridlines',
                labelAlign: 'left',
                width: 225,
                labelWidth: 200
            },
            {
                name: 'releaseGridlines',
                xtype: 'rallycheckboxfield',
                fieldLabel: 'Release Gridlines',
                labelAlign: 'left',
                width: 225,
                labelWidth: 200
            },
            {
                name: 'milestoneGridlines',
                xtype: 'rallycheckboxfield',
                fieldLabel: 'Milestone Gridlines',
                labelAlign: 'left',
                width: 225,
                labelWidth: 200
            },
            {
                name: 'dependencyStrings',
                xtype: 'rallycheckboxfield',
                fieldLabel: 'Dependency strings',
                labelAlign: 'left',
                width: 225,
                labelWidth: 200
            },
            {
                name: 'todayGridline',
                xtype: 'rallycheckboxfield',
                fieldLabel: 'Today Gridline',
                labelAlign: 'left',
                width: 225,
                labelWidth: 200
            },
        ];
        return returned;
    },
    _changedItems: [],
    itemId: 'rallyApp',
    MIN_COLUMN_WIDTH: 200,
    _rowHeight: 40,
    STORE_FETCH_FIELD_LIST: [
        'Name',
        'FormattedID',
        'PlannedStartDate',
        'PlannedEndDate',
        'ActualStartDate',
        'ActualEndDate',
        'Parent',
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
        'OrderIndex',   //Used to get the State field order index
        'PortfolioItemType',
        'Ordinal',
        'Release',
    ],
    CARD_DISPLAY_FIELD_LIST: [
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
    ],

    items: [
        {
            xtype: 'container',
            layout: 'auto',
            items: [
                {
                    xtype: 'container',
                    itemId: 'piControlsContainer',
                    flex: 1,
                    width: '99%',
                    layout: {
                        type: 'hbox',
                        align: 'middle',
                        defaultMargins: '0 25 10 0'
                    }
                },
                {
                    xtype: 'container',
                    itemId: 'filterBox',
                    margin: '10 0 10 0',
                    width: '99%',
                    flex: 1
                },
                {
                    xtype: 'container',
                    itemId: 'timelineContainer',
                    id: 'timelineContainer',
                    width: '99%',
                    overflowX: 'scroll',
                    height: 'auto',
                    layout: 'auto',
                    items: [
                        {
                            xtype: 'container',
                            itemId: 'rootSurface',
                            id: 'rootSurface',
                            padding: '10 0 5 0',
                            layout: 'auto',
                            width: 5000,
                            title: 'Loading...',
                            autoEl: { tag: 'svg' },
                            listeners: { afterrender: function () { gApp = this.up('#rallyApp'); } },
                            visible: false
                        }
                    ]
                }
            ]
        }
    ],

    _nodeTree: null,

    launch: function () {
        gApp.ready = false;
        gApp.loadingTimeline = false;
        Rally.data.wsapi.Proxy.superclass.timeout = 240000;
        Rally.data.wsapi.batch.Proxy.superclass.timeout = 240000;

        gApp.down('#piControlsContainer').add([
            {
                xtype: 'container',
                id: 'piTypeContainer',
                layout: {
                    type: 'hbox',
                    align: 'middle'
                }
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
                            html: '<div><p>Scoping only applied to top level. All child artifacts will be returned regardless of project.</p><p>When scoping across all projects, top level results will be limited</p></div>',
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
                cls: 'blue-tabs',
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
                        padding: 0
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
                        height: 65,
                        width: '95%'
                    }
                ]
            });

        gApp.down('#filterBox').on('resize', gApp._setTimelineHeight);
        gApp._addAncestorPlugin();
    },

    _kickOff: async function () {
        // variable to bind to the expand/collapse all button on timeline
        gApp.expandData = [{ expanded: true }];
        gApp._typeStore = gApp.ancestorFilterPlugin.portfolioItemTypes;

        var childTypes = gApp._getTypeList(gApp._highestOrdinal() - 1);
        var childModels = [];
        _.each(childTypes, function (model) { childModels.push(model.Type); });

        gApp.tabPanel.child('#chartControlsTab').add({
            xtype: 'chartControls',
            cmp: gApp
        });

        setTimeout(async function () {
            if (gApp.ancestorFilterPlugin._isSubscriber()) {
                gApp.advFilters = gApp.ancestorFilterPlugin.getMultiLevelFilters();
            }
            await gApp._updatePiTypeList();
            await gApp._addSharedViewsCombo();
            document.getElementById('timelineContainer').onscroll = gApp._timelineScrolled;
            gApp._updateFilterTabText();
            gApp._updateAncestorTabText();
            gApp.ready = true;
            gApp._refreshTimeline();
        }, 400);
    },

    _addAncestorPlugin: function () {
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
                    },
                    {
                        xtype: 'component',
                        id: 'subscriberFilterIndicator',
                        html: '<span class="icon-link icon-large"></span>',
                        hidden: true
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

        gApp.ancestorFilterPlugin = Ext.create('Utils.AncestorPiAppFilter', {
            ptype: 'UtilsAncestorPiAppFilter',
            pluginId: 'ancestorFilterPlugin',
            panelRenderAreaId: 'chartFilterPanelArea',
            btnRenderAreaId: 'chartFilterButtonArea',
            filtersHidden: false,
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
                        },
                        change: gApp._onFilterChange
                    });
                    gApp.ancestorFilterPlugin.renderArea.down('#ignoreScopeControl').hide();
                    if (gApp.ancestorFilterPlugin._isSubscriber()) {
                        gApp.down('#applyFiltersBtn').hide();
                        gApp.down('#chartFiltersTab').hide();
                        gApp.down('#subscriberFilterIndicator').show();
                    }
                    gApp.advFilters = plugin.getMultiLevelFilters();
                    gApp._kickOff();
                },
                single: true
            }
        });
        gApp.addPlugin(gApp.ancestorFilterPlugin);
    },

    _refreshTimeline: async function () {
        // Lots of listeners and events. Lets ensure the timeline only loads once
        if (gApp.loadingTimeline || gApp.settingView || !gApp.ready) { return; }
        gApp._removeSVGTree();
        gApp._clearNodes();

        // Reset height so the loading mask shows properly
        var rs = gApp.down('#rootSurface');
        rs.getEl().setHeight(300);

        gApp.setLoading('Loading timeboxes...');
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

        gApp.setLoading('Loading portfolio items...');

        return new Promise(function (resolve, reject) {
            if (gApp._isAncestorSelected()) {
                // Ancestor plugin gives us the ref and typepath, so we need to fetch
                // the actual record before proceeding
                var piData = gApp.ancestorFilterPlugin._getValue();
                gApp._fetchRecordByRef(piData, function (store, records, success) {
                    if (success) {
                        if (records && records.length) {
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
                var topType = gApp._getTopLevelType();
                if (topType) {
                    gApp.expandData[0].expanded = false;
                    gApp._getArtifacts(topType, resolve, reject);
                }
                else { resolve(); }
            }
        }).then(
            // RESOLVE
            function () {
                gApp._removeChildlessNodes();
                gApp._findDateRange();
                gApp._recalculateTree();
                if (!gApp._isAncestorSelected()) { gApp._collapseAll(); }
            },
            // REJECT
            function (error) {
                console.log(error);
                gApp._showError(gApp._parseError(error, 'Failed while fetching portfolio items. Please reload and try again.'));
            }
        ).finally(function () {
            gApp.setLoading(false);
            gApp.loadingTimeline = false;
        });
    },

    _buildConfig: function (type, parentRecords) {
        var dataContext = gApp.getContext().getDataContext();
        var typePath = type.get('TypePath');
        var filters = gApp.ancestorFilterPlugin.getMultiLevelFiltersForType(typePath);
        var scopeAllProjects = gApp.down('#scopeCombobox').getValue();
        var topLevelTypePath = gApp.down('#piTypeCombobox').getValue();

        // If scoping is set to all projects and we're retrieving the top level PIs
        // we  limit the results for performance reasons
        var pagesize = 800;
        if (scopeAllProjects && typePath === topLevelTypePath) {
            let ord = gApp._getOrdFromTypePath(typePath);
            if (ord) {
                if (ord === 1) {
                    pagesize = 200;
                }
                else if (ord === 2) {
                    pagesize = 100;
                }
                else {
                    pagesize = 30;
                }
            }
        }

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

        if (filters && filters.length) {
            config.filters = config.filters.concat(filters);
        }

        if (!scopeAllProjects && typePath === topLevelTypePath) {
            // Keep project scoping
        }
        else {
            dataContext.project = null;
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

        config.context = dataContext;

        return Ext.clone(config);
    },

    _getArtifactsFromRoot: function (records, resolve, reject) {
        if (records.length) {
            gApp._nodes = gApp._nodes.concat(gApp._createNodes(records));
            gApp.setLoading(`Loading portfolio items... (${gApp._nodes.length} fetched so far)`);
            let childType = gApp._findChildType(records[0]);

            if (childType) {
                try {
                    let promises = [];
                    let maxResults = 5;
                    while (records.length) {
                        let chunk = records.splice(0, maxResults);
                        let config = gApp._buildConfig(childType, chunk);
                        promises.push(new Promise(function (newResolve, newReject) {
                            Ext.create('Rally.data.wsapi.Store', config).load()
                                .then({
                                    success: function (results) {
                                        gApp._getArtifactsFromRoot(results, newResolve, newReject);
                                    },
                                    failure: function (error) { newReject(error); },
                                    scope: this
                                });
                        }));
                    }
                    Promise.all(promises).then(resolve, function (e) { reject(e); });
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

                            let ord = topType.get('Ordinal');

                            // The higher the top level, the more we want to break up the results due
                            // to using a recursive function to build the hierarchy
                            let maxResults = (function (ord) {
                                switch (ord) {
                                    case 0:
                                        return 10000;
                                    case 1:
                                        return 10;
                                    case 2:
                                        return 4;
                                    default:
                                        return 1;
                                }
                            })(ord);
                            if (results.length <= maxResults) {
                                gApp._getArtifactsFromRoot(results, resolve, reject);
                            } else {
                                let promises = [];
                                while (results.length) {
                                    promises.push(new Promise(function (newResolve, newReject) {
                                        if (results.length >= maxResults) {
                                            gApp._getArtifactsFromRoot(results.splice(0, maxResults), newResolve, newReject);
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

    _recalculateTree: function () {
        if (gApp._nodes.length === 0) { return; }
        gApp._rowHeight = gApp.getSetting('lineSize') || 40;

        var nodetree = gApp._createNodeTree(gApp._nodes);
        if (!nodetree) { return; }

        gApp._setSVGDimensions(nodetree);
        gApp._initialiseScale();
    },

    _initialiseScale: function () {
        gApp.viewportDays = gApp.tlBack + gApp.tlAfter;
        gApp._setAxisDateFields(gApp.tlStart, gApp.tlEnd);
    },

    // Used to set both axis dates without triggering the redraw twice
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

        gApp._redrawTree();
    },

    _setTimeScaler: function (timebegin, timeend) {
        gApp.dateScaler = d3.scaleTime()
            .domain([timebegin, timeend])
            .range([0, parseInt(d3.select('#rootSurface').attr('width')) - (gApp._rowHeight + 10)]);
    },

    _redrawTree: function () {
        if (gApp.settingView || !gApp._timelineHasItems()) { return; }

        gApp._clearSharedViewCombo();
        gApp._setZoomButtons();
        gApp._removeSVGTree();
        gApp._createSVGTree();
        gApp._setAxis();
        gApp.currentScrollX = document.getElementById('timelineContainer').scrollLeft;
        gApp._updateRowLabelLocations();
    },

    _setAxis: function () {
        if (gApp.settingView || !gApp._timelineHasItems()) { return; }

        gApp._clearSharedViewCombo();

        if (gApp.gX) { gApp.gX.remove(); }

        let svg = d3.select('#rootSurface');
        let width = +svg.attr('width');
        let height = +svg.attr('height');
        let viewportWidth = gApp.down('#timelineContainer').getEl().getWidth();
        let viewportPercentage = width / viewportWidth;
        let showCalendarTicks = gApp.down('#dateGridlineCheckbox').getValue();
        let topPadding = 35;
        topPadding += gApp._showReleaseHeader() ? 25 : 0;
        topPadding += gApp._showIterationHeader() ? 26 : 0;

        gApp.xAxis = d3.axisBottom(gApp.dateScaler)
            .ticks(viewportPercentage * 8)
            .tickSize(showCalendarTicks ? height : 0)
            .tickPadding(showCalendarTicks ? 22 - height : 22);
        gApp.gX = svg.append('g');

        gApp.gX.append('rect')
            .attr('width', width - (gApp._rowHeight + 10))
            .attr('height', gApp._rowHeight + (gApp._showIterationHeader() && gApp._showReleaseHeader() ? gApp._rowHeight : 0))
            .attr('fill', 'white');

        gApp.gX.attr('transform', 'translate(' + gApp._rowHeight + ',0)')
            .attr('id', 'axisBox')
            .attr('width', width - (gApp._rowHeight + 10))
            .attr('height', height)
            .attr('class', 'axis')
            .call(gApp.xAxis);

        if (showCalendarTicks) {
            d3.selectAll('.tick line').attr('y1', topPadding);
        }

        if (!gApp.down('#dateAxisCheckbox').getValue()) {
            d3.selectAll('.tick text').attr('y', -50);
        }

        if (gApp.iterations && gApp.iterations.length && gApp.down('#iterationGridlineCheckbox').getValue()) {
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
                .on('mouseout', function () {
                    d3.select(this).attr('class', 'iteration-line');
                    d3.select('#tooltip-iteration-line').remove();
                });
        }

        if (gApp.down('#releaseGridlineCheckbox').getValue()) {
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
                    let tipId = 'tooltip-release-line';

                    gApp._addHoverTooltip(this, 'release-line-hover', tipId, tipText, 160, 60);
                })
                .on('mouseout', function () {
                    d3.select(this).attr('class', 'release-line');
                    d3.select('#tooltip-release-line').remove();
                });
        }

        if (gApp.milestones && gApp.milestones.length && gApp.down('#milestoneGridlineCheckbox').getValue()) {
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

        if (gApp.down('#todayGridlineCheckbox').getValue()) {
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
        }

        if (gApp._showReleaseHeader()) {
            var releases = gApp.gX.selectAll(".releaseNode")
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
                .text(function (d) { return d.get('Name'); })
                .attr('fill', 'black');
        }

        if (gApp._showIterationHeader()) {
            var iterations = gApp.gX.selectAll('.iterationNode')
                .data(gApp.iterations)
                .enter().append('g')
                .attr('class', 'iterationNode')
                .attr('id', function (d) { return 'iteration-' + d.get('Name'); })
                .attr('transform', function (d) {
                    gApp._initIterationTranslate(d);
                    return d.translate;
                });

            // Iteration bars
            iterations.append('rect')
                .attr('width', function (d) { return d.drawnWidth; })
                .attr('height', gApp._rowHeight / 2)
                .attr('fill', '#f2f2f2')
                .attr('stroke', '#808080')
                .attr('stroke-opacity', 0.5);

            // Iteration Name
            iterations.append('text')
                .attr('x', function (d) { return d.drawnWidth / 2; })
                .attr('y', gApp._rowHeight / 4 + 3)
                .text(function (d) { return d.get('Name'); })
                .attr('fill', 'black');
        }

        // Expand / Collapse all
        gApp.gX.selectAll('.expandAll')
            .data(gApp.expandData)
            .enter().append('g')
            .append('text')
            .attr('id', 'expandAllText')
            .attr('x', 0)
            .attr('y', 25)
            .attr('class', function (d) { return 'icon-gear app-menu ' + (d.expanded ? 'collapse-arrow' : 'expand-arrow'); })
            .attr('alignment-baseline', 'central')
            .text(function (d) { return d.expanded ? '9' : '7'; })
            .on('click', function (d) {
                d.expanded = !d.expanded;
                if (!d.expanded) { gApp._collapseAll(); } else { gApp._expandAll(); }
            });

        gApp._timelineScrolled({ currentTarget: { scrollLeft: gApp.currentScrollX, scrollTop: document.getElementById('timelineContainer').scrollTop } });
    },

    // Called when user clicks on an item in the timeline
    // Sets the timeline view to the planned dates for that item
    _setViewportToPi: function (d) {
        let piPadding = 1;
        let start = d.data.record.get('PlannedStartDate');
        let end = d.data.record.get('PlannedEndDate');
        let viewportStartInDays = gApp._daysBetween(start, gApp.tlStart);
        viewportStartInDays -= viewportStartInDays > 5 ? piPadding : 0;

        gApp.viewportDays = gApp._daysBetween(end, start) + piPadding * 4;
        gApp._redrawTree();
        gApp.down('#timelineContainer').getEl().setScrollLeft(gApp._getViewportScaler() * viewportStartInDays);
    },

    _addHoverTooltip: function (hoverEl, hoverElClass, tipId, tipText, width, height) {
        let coords = d3.mouse(hoverEl);
        let tooltip = d3.select('#axisBox').append('g')
            .attr('id', tipId)
            .attr('class', 'timeline-tooltip')
            .attr('transform', `translate(${coords[0] + 20},${coords[1]})`);

        tooltip.append('rect')
            .attr('width', width)
            .attr('height', height)
            .attr('rx', 7)
            .attr('ry', 7);

        let textObj = tooltip.append('text')
            .attr('y', 3)
            .text('');

        _.each(tipText, function (newLine) {
            textObj.append('tspan')
                .attr('x', width / 2)
                .attr('dy', '1.3em')
                .text(newLine);
        });

        d3.select(hoverEl).attr('class', hoverElClass);
    },

    _clearSharedViewCombo: function () {
        if (!gApp.preventViewReset) {
            gApp.down('#timelineSharedViewCombobox').setValue(null);
        }
    },

    _resetAxis: function () {
        gApp._findDateRange();
        gApp._initialiseScale();
    },

    _resetView: function () {
        gApp._clearSharedViewCombo();

        gApp.loadingTimeline = true;
        gApp.ancestorFilterPlugin._clearAllFilters();
        let clearFilters = gApp.ancestorFilterPlugin.getMultiLevelFilterStates();

        gApp.viewportDays = gApp.tlBack + gApp.tlAfter;

        gApp.setCurrentView({
            piTypeCombobox: gApp._getTopLevelTypePath(),
            scopeCombobox: false,
            axisStartDate: gApp.tlStart,
            axisEndDate: gApp.tlEnd,
            axisLabels: {
                dates: gApp.getSetting('calendarOverlay'),
                iterations: gApp.getSetting('iterationOverlay'),
                releases: gApp.getSetting('releaseOverlay')
            },
            gridlines: {
                dates: gApp.getSetting('calendarGridlines'),
                iterations: gApp.getSetting('iterationGridlines'),
                releases: gApp.getSetting('releaseGridlines'),
                milestones: gApp.getSetting('milestoneGridlines'),
                dependencies: gApp.getSetting('dependencyStrings'),
                today: gApp.getSetting('todayGridline')
            },
            rowLabels: 'showLabelsCheckbox',
            percentDone: 'doneByEstimateCheckbox',
            filters: clearFilters,
            ancestor: {
                ignoreProjectScope: false,
                isPiSelected: false,
                pi: null,
                piTypePath: gApp.ancestorFilterPlugin._defaultPortfolioItemType()
            }
        });
    },

    _onAxisDateChange: function (dateField, isValid) {
        if (!isValid) { return; }

        var axisStart = gApp.down('#axisStartDate');
        var startDate = axisStart.getValue();

        var axisEnd = gApp.down('#axisEndDate');
        var endDate = axisEnd.getValue();

        if (endDate < startDate) {
            Rally.ui.notify.Notifier.showError({ message: 'End date must be greater than start date' });
            return;
        }

        gApp.tlStart = startDate;
        gApp.tlEnd = endDate;
        gApp._redrawTree();
    },

    _timelineHasItems: function () {
        if (!gApp._nodes || !gApp._nodes.length) {
            return false;
        }
        else if (gApp._nodes.length === 1 && gApp._nodes[0].Name === 'root') {
            return false;
        }
        return true;
    },

    // Called when the user scrolls the timeline
    // Translates the portfolio item labels so they remain on the left side of the screen
    _timelineScrolled: function (e) {
        let x = e.currentTarget.scrollLeft;
        let y = e.currentTarget.scrollTop;

        // Scrolling vertically
        if (x === gApp.currentScrollX) {
            d3.select('#axisBox').attr('transform', `translate(${gApp._rowHeight},${y})`);
        }
        else {
            gApp.currentScrollX = x;
            gApp._updateRowLabelLocations();
        }
    },

    _updateRowLabelLocations: function () {
        d3.select('#rowLabelGroup').attr('transform', `translate(${gApp.currentScrollX},0)`);
        document.getElementById('expandAllText').setAttribute('x', gApp.currentScrollX);
    },

    _zoom: function (zoomIn) {
        let timelineDays = gApp._daysBetween(gApp.tlEnd, gApp.tlStart);
        let zoomVal = gApp._getZoomValue();

        gApp.viewportDays = zoomIn ?
            _.max([gApp.maxZoom, gApp.viewportDays - zoomVal]) :
            _.min([timelineDays, gApp.viewportDays + zoomVal]);

        gApp._setZoomButtons();
        gApp._redrawTree();
    },

    _setZoomButtons: function () {
        gApp.down('#zoomInBtn').setDisabled(gApp.viewportDays === gApp.maxZoom);
        gApp.down('#zoomOutBtn').setDisabled(gApp.viewportDays === gApp._daysBetween(gApp.tlEnd, gApp.tlStart));
    },

    _getZoomValue() {
        return Math.round(gApp.viewportDays * gApp.zoomFactor);
    },

    _switchChildren: function (d) {
        if (d.children) { gApp._collapse(d); }
        else { gApp._expand(d); }
        gApp._redrawTree();
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
        gApp._redrawTree();
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
            gApp._redrawTree();
        } else {
            for (let i = 0; i < gApp._getTopLevelTypeOrdinal(); i++) {
                d3.selectAll('.collapse-icon').dispatch('expandAll');
                gApp._redrawTree();
            }
        }
        gApp.setLoading(false);
    },

    _viewportHasVerticalScroll: function () {
        let vp = document.getElementById('timelineContainer');
        return vp && vp.clientHeight !== vp.scrollHeight;
    },

    _getRemainingWindowHeight: function () {
        let filterHeight = gApp.down('#filterBox').getHeight();
        let controlsHeight = gApp.down('#piControlsContainer').getHeight();
        let appHeight = gApp.getHeight();

        return appHeight - filterHeight - controlsHeight - 40;
    },

    _setTimelineHeight: function () {
        gApp.down('#timelineContainer').setHeight(gApp._getRemainingWindowHeight());
    },

    _getSVGHeight: function () {
        return parseInt(d3.select('#rootSurface').attr('height')) - gApp._rowHeight;
    },

    _setSVGDimensions: function (nodetree) {
        let svg = d3.select('#rootSurface');
        let rs = gApp.down('#rootSurface');
        let timelineContainer = gApp.down('#timelineContainer').getEl();
        let viewportWidth = timelineContainer.getWidth();
        let viewportScaler = gApp._getViewportScaler();
        let timelineWidth = viewportScaler === 1 ? viewportWidth - 20 : gApp._daysBetween(gApp.tlEnd, gApp.tlStart) * viewportScaler;

        svg.attr('height', gApp._rowHeight * (nodetree.value + 1 + (gApp._showReleaseHeader() ? 1 : 0) + (gApp._showIterationHeader() ? 1 : 0)));
        rs.getEl().setHeight(svg.attr('height'));
        rs.getEl().setWidth(timelineWidth);
        svg.attr('width', timelineWidth);
        svg.attr('class', 'rootSurface');

        if (gApp.currentScrollX && gApp.previousTimelineWidth) {
            timelineContainer.setScrollLeft(gApp.currentScrollX + Math.round((timelineWidth - gApp.previousTimelineWidth) / 2));
        }
        else {
            timelineContainer.setScrollLeft((gApp._daysBetween(new Date(), gApp.tlStart) - gApp._daysBetween(new Date(), Ext.Date.subtract(new Date(), Ext.Date.DAY, gApp.tlBack))) * viewportScaler);
        }

        gApp.previousTimelineWidth = timelineWidth;
        gApp._setTimeScaler(gApp.tlStart, gApp.tlEnd);
    },

    // Returns the number of pixels per day given the current
    // viewport width and number of days to show in the viewport
    _getViewportScaler: function () {
        var viewportWidth = gApp.down('#timelineContainer').getEl().getWidth();
        if (gApp._viewportHasVerticalScroll()) {
            viewportWidth -= 15;
        }
        return (Math.round(viewportWidth / (gApp.viewportDays || 1))) || 1;
    },

    _daysBetween: function (endDate, startDate) {
        return Rally.util.DateTime.getDifference(endDate, startDate, 'day');
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
        d.drawnY = gApp._rowHeight + (gApp._showReleaseHeader() ? gApp._rowHeight / 1.5 : 0);
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
        d.drawnY = gApp._rowHeight;//-(gApp._rowHeight / 1.5) - (gApp._showIterationHeader() ? gApp._rowHeight / 1.5 : 0);
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

    _initTextRowTranslate: function (d) {
        var svgHeight = gApp._getSVGHeight();
        d.plannedDrawnY = ((d.x0 * svgHeight) + (d.depth * gApp._rowHeight)) - (gApp._shouldShowRoot() ? 0 : gApp._rowHeight);
        d.textDrawnX = 0;
        d.textTranslate = "translate(" + d.textDrawnX + "," + d.plannedDrawnY + ")";
    },

    _createSVGTree: function () {
        var symbolWidth = 20;
        gApp._nodeTree.sum(function () { return 1; });
        var partition = d3.partition();
        var nodetree = partition(gApp._nodeTree);

        gApp._setSVGDimensions(nodetree);
        gApp._initializeSVG();

        var labelGroup = d3.select('#zoomTree').append('g')
            .attr('id', 'rowLabelGroup');

        var labelGroupRows = labelGroup.selectAll('.textRows')
            .data(nodetree.descendants())
            .enter().filter(function (d) { return d.data.record.id === "root" ? gApp._shouldShowRoot() : true; })
            .append("g")
            .attr('class', function (d) { return 'timelineRowText' + ((d.children || d._children) ? ' childrenText' : ''); })
            .attr('transform', function (d) {
                gApp._initTextRowTranslate(d);
                return d.textTranslate;
            });


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
            .attr('opacity', 1)
            .attr('class', 'clickable')
            .attr('id', function (d) { return 'rect-' + d.data.Name + '-actual'; });

        // Pecent done text
        actualRows.filter(function (d) { return d.data.record.get('ActualStartDate'); })
            .append('text')
            .attr('x', function (d) { return d.actualDrawnWidth / 2; })
            .attr('y', gApp._rowHeight / 4 + 2)
            .attr('style', 'font-size:10')
            .text(function (d) {
                if (d.actualDrawnWidth) {
                    if (gApp.down('#doneByEstimateCheckbox').getValue()) {
                        return (d.data.record.get('PercentDoneByStoryPlanEstimate') * 100).toFixed(0) + '%';
                    }
                    else {
                        return (d.data.record.get('PercentDoneByStoryCount') * 100).toFixed(0) + '%';
                    }
                }
                return '';
            });

        // Planned date bars
        plannedRows.filter(function (d) {
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
            .attr('class', 'clickable')
            .on('mouseover', function (d, idx, arr) { gApp._nodeMouseOver(d, idx, arr); })
            .on('mouseout', function (d, idx, arr) { gApp._nodeMouseOut(d, idx, arr); })
            .on('click', function (d) {
                if (!d3.event.altKey && d.data.record.get('PlannedStartDate') && d.data.record.get('PlannedEndDate')) {
                    gApp._setViewportToPi(d);
                }
            });

        // Triple bar symbol (hamburger button)
        labelGroupRows.append('text')
            .attr('y', gApp._rowHeight / 4)
            .attr('x', function (d) { return 5 - d.textDrawnX + (d.depth * 10); })
            .attr('alignment-baseline', 'central')
            .text('V')
            .attr('class', 'icon-gear app-menu')
            .on('click', function (d) { gApp._itemMenu(d); });

        // PI ID and Name text
        labelGroupRows.append('text')
            .attr('id', function (d) { return 'text-' + d.data.Name; })
            .attr('x', function (d) { return symbolWidth + 5 - d.textDrawnX + (d.depth * 10); })
            .attr('y', gApp._rowHeight / 4)  //Should follow point size of font
            .attr('class', 'clickable normalText')
            .attr('editable', 'none')
            .attr('alignment-baseline', 'central')
            .attr('style', 'font-size:12')
            .on('mouseover', function (d, idx, arr) { gApp._nodeMouseOver(d, idx, arr); })
            .on('mouseout', function (d, idx, arr) { gApp._nodeMouseOut(d, idx, arr); })
            .on('click', function (d) {
                if (!d3.event.altKey && d.data.record.get('PlannedStartDate') && d.data.record.get('PlannedEndDate')) {
                    gApp._setViewportToPi(d);
                }
            })
            .text(function (d) {
                let formattedID = d.data.record.get('FormattedID');
                let piName = d.data.record.get('Name');
                if (gApp.down('#idOnlyCheckbox').getValue()) {
                    return formattedID;
                }
                else if (gApp.down('#shortenLabelsCheckbox').getValue() && piName.length > 20) {
                    piName = piName.substring(0, 20) + '...';
                }
                return `${formattedID}: ${piName}`;
            });

        // Expand / Collapse arrows
        gApp.expandables = d3.selectAll('.childrenText').append('text')
            .attr('x', function (d) { return -(symbolWidth + d.textDrawnX) + (d.depth * 10); })
            .attr('y', gApp._rowHeight / 4)
            .attr('class', function (d) { return 'icon-gear app-menu collapse-icon ' + (d.children ? 'collapse-arrow' : 'expand-arrow'); })
            .attr('alignment-baseline', 'central')
            .text(function (d) { return d.children ? '9' : '7'; })
            .on('click', function (d, idx, arr) { gApp._switchChildren(d, idx, arr); })
            .on('collapseAll', function (d) { gApp._collapse(d); })
            .on('expandAll', function (d) { gApp._expand(d); });

        if (gApp.down('#showDependenciesCheckbox').getValue()) {
            nodetree.each(function (d) {
                // Now add the dependencies lines
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
                                    // Stuff without end point // TODO source.node is sometimes null
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
        if (!d.parent || !d.parent.data.record.data.ObjectID || d.parent.id === 'root') {
            return false;
        }

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
        }
    },

    _nodes: [],

    onSettingsUpdate: function () {
        setTimeout(gApp._refreshTimeline, 500);
    },

    _onAncestorFilterChange: async function () {
        gApp._updateAncestorTabText();
        await gApp._updatePiTypeList();
        gApp._refreshTimeline();
    },

    onTimeboxScopeChange: function (newTimebox) {
        this.callParent(arguments);
        gApp.timeboxScope = newTimebox;
        gApp._refreshTimeline();
    },

    _onFilterChange: function (filters) {
        gApp.advFilters = filters;
        gApp._updateFilterTabText();

        // If user clears filters or is a subscriber, update timeline, otherwise store the added filter
        if (!gApp._hasFilters() || gApp.ancestorFilterPlugin._isSubscriber()) {
            gApp._applyFilters(gApp.down('#applyFiltersBtn'));
        }
        else {
            gApp.down('#applyFiltersBtn').setDisabled(false);
        }

        gApp._clearSharedViewCombo();
    },

    _onTopLevelPIChange: function () {
        gApp._refreshTimeline();
    },

    _onScopeChange: function () {
        gApp._refreshTimeline();
    },

    _onRowLabelChange: function (radio, newValue) {
        // Called twice when selected new radio button
        // We want to redraw the tree on the second handler
        // once both radio buttons have finished updating values
        if (newValue) { return; }
        gApp._redrawTree();
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

    // When an ancestor is selected, we need to filter out PI types that are
    // above the selected ancestor since the project scoping wouldn't apply
    _updatePiTypeList: function () {
        let container = gApp.down('#piTypeContainer');
        container.removeAll(true);

        let config = {
            autoLoad: false,
            model: Ext.identityFn('TypeDefinition'),
            sorters: {
                property: 'Ordinal',
                direction: 'Desc'
            },
            fetch: ['Name', 'Ordinal', 'TypePath'],
            filters: [
                {
                    property: 'Parent.Name',
                    operator: '=',
                    value: 'Portfolio Item'
                },
                {
                    property: 'Creatable',
                    operator: '=',
                    value: 'true'
                }
            ]
        };

        if (gApp._isAncestorSelected()) {
            config.filters.push({
                property: 'Ordinal',
                operator: '<=',
                value: gApp._getAncestorTypeOrdinal()
            });
        }

        return new Promise(function (resolve, reject) {
            // Load store first to avoid ridiculous 'getRecord of null' error
            let piStore = Ext.create('Rally.data.wsapi.Store', config);
            piStore.load().then({
                success: function () {
                    container.add({
                        xtype: 'rallyportfolioitemtypecombobox',
                        itemId: 'piTypeCombobox',
                        stateful: true,
                        stateId: gApp.getContext().getScopedStateId('CustomAgile.PortfolioItemTimeline.topLevelPIType'),
                        stateEvents: ['select'],
                        store: piStore,
                        fieldLabel: 'PI Type',
                        labelStyle: 'font-size: 14px',
                        labelWidth: 70,
                        valueField: 'TypePath',
                        allowNoEntry: false,
                        defaultSelectionPosition: 'first',
                        listeners: {
                            scope: gApp,
                            change: function () {
                                gApp._onTopLevelPIChange();
                            },
                            ready: function () {
                                resolve();
                            }
                        },
                        // Disable the preference enabled combo box plugin so that this control value is app specific
                        plugins: []
                    });
                },
                failure: function () {
                    Rally.ui.notify.Notifier.showError({ message: 'Error while loading portfolio item type store' });
                    reject();
                },
                scope: this
            });
        });
    },

    _addSharedViewsCombo: function () {
        return new Promise(function (resolve) {
            gApp.down('#piControlsContainer').add([
                {
                    xtype: 'rallysharedviewcombobox',
                    title: 'Shared Views',
                    itemId: 'timelineSharedViewCombobox',
                    enableUrlSharing: true,
                    context: gApp.getContext(),
                    cmp: gApp,
                    listeners: {
                        ready: function (combo) {
                            combo.setValue(null);
                            resolve();
                        }
                    }
                },
                {
                    xtype: 'rallybutton',
                    text: 'Reset View',
                    itemId: 'resetViewBtn',
                    handler: gApp._resetView
                }
            ]);
        });
    },

    // Iterate through the nodes and find the earliest planned or actual start date and
    // latest planned or actual end date in order to set the range for the timeline
    _findDateRange: function () {
        // These min/max years are used to filter out bad data (I saw a PlannedStartDate of 06/01/0019...)
        let minYear = 2000;
        let maxYear = 2200;
        let maxDate = new Date('01/01/' + minYear);
        let minDate = new Date('12/01/' + maxYear);

        _.each(gApp._nodes, function (node) {
            let planStart = node.record.get('PlannedStartDate');
            let actualStart = node.record.get('ActualStartDate');
            let planEnd = node.record.get('PlannedEndDate');
            let actualEnd = node.record.get('ActualEndDate');

            if (planStart && planStart < minDate && planStart.getFullYear() > minYear) {
                minDate = planStart;
            }
            if (actualStart && actualStart < minDate && actualStart.getFullYear() > minYear) {
                minDate = actualStart;
            }
            if (planEnd && planEnd > maxDate && planEnd.getFullYear() < maxYear) {
                maxDate = planEnd;
            }
            if (actualEnd && actualEnd > maxDate && actualEnd.getFullYear() < maxYear) {
                maxDate = actualEnd;
            }
        });

        gApp.tlStart = minDate.getFullYear() === maxYear ? Ext.Date.subtract(new Date(), Ext.Date.DAY, gApp.tlBack) : minDate;
        gApp.tlEnd = maxDate <= new Date() ? Ext.Date.add(new Date(), Ext.Date.DAY, gApp.tlAfter) : maxDate;
    },

    // Since we're filtering on a specific PI type, we want to scan through all types above the
    // lowest filtered type and remove PIs that have no children so the end user has a cleaner view 
    // of PIs that they care about
    _removeChildlessNodes: function () {
        if (!gApp._nodes || !gApp._hasFilters()) { return; }

        var toDelete = true;
        var currentOrd = gApp._getLowestFilteredOrdinal() + 1;
        var maxOrd = (gApp._isAncestorSelected() ? gApp._getAncestorTypeOrdinal() - 1 : gApp._getTopLevelTypeOrdinal());

        while (currentOrd <= maxOrd) {
            let currentType = gApp._findTypeByOrdinal(currentOrd);

            if (currentType) {
                _.each(gApp._nodes, function (node) {
                    if (!gApp._recordIsRoot(node) && node.record.get('PortfolioItemType').Ordinal === currentOrd) {
                        for (let isChild of gApp._nodes) {
                            // If we find a child node of current node, don't delete current node
                            if (!gApp._recordIsRoot(node) && !isChild.toDelete && isChild.record.get('Parent') && isChild.record.get('Parent').ObjectID === node.record.get('ObjectID')) {
                                toDelete = false;
                                break;
                            }
                        }
                        node.toDelete = toDelete;
                        toDelete = true;
                    }
                });
            }
            currentOrd++;
        }

        gApp._nodes = _.filter(gApp._nodes, function (node) {
            return !node.toDelete;
        });
    },

    _recordIsRoot: function (record) {
        return record.Name === 'root' || record.record.id === 'root';
    },

    // A default project exists as the source of truth for Iterations and Releases
    // If the user has access to this project, use these timeboxes for the timeline
    // If the user doesn't have access, traverse up the project hierarchy and use
    // the top-most project as the timebox source of truth
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

    _piTypeHasFilters: function (type) {
        _.each(gApp.advFilters, function (val, key) {
            if (type.toLowerCase() === key.toLowerCase()) {
                return !!val.length;
            }
        });
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

    _getTopLevelTypeOrdinal: function () {
        var type = gApp._getTopLevelType();
        return type ? type.get('Ordinal') : 0;
    },

    _getTopLevelTypePath: function () {
        return gApp.down('#piTypeCombobox').getValue();
    },

    _getTopLevelType: function () {
        var typePath = gApp._getTopLevelTypePath();
        var type = _.find(gApp._typeStore, function (thisType) { return thisType.get('TypePath') === typePath; });
        return type;
    },

    _isAncestorSelected: function () {
        return !!gApp.ancestorFilterPlugin._getValue().pi;
    },

    _getAncestorTypeOrdinal() {
        return gApp._getOrdFromTypePath(gApp.ancestorFilterPlugin._getValue().piTypePath);
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
        var lowestOrd = gApp._highestOrdinal() + 1;
        if (gApp.advFilters) {
            _.each(gApp.advFilters, function (filter, key) {
                if (filter.length) {
                    let ord = gApp._getOrdFromTypePath(key);
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

    _getOrdFromTypePath: function (typePath) {
        var ord = null;
        _.each(gApp._typeStore, function (type) {
            if (typePath.toLowerCase() === type.get('TypePath').toLowerCase()) {
                ord = type.get('Ordinal');
            }
        });
        return ord;
    },

    _shouldShowRoot: function () {
        return gApp._isAncestorSelected();
    },

    _showReleaseHeader: function () {
        return gApp.down('#releasesCheckbox').getValue();
    },

    _showIterationHeader: function () {
        return gApp.down('#iterationsCheckbox').getValue();
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
                var retval = (d.record && gApp._getNodeTreeRecordId(d.record)) || null;
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
            gApp._nodeTree = gApp._stratifyNodeTree(nodes).sum(function () { return 1; });
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

    _initializeSVG: function () {
        var svg = d3.select('#rootSurface');
        svg.append("g")
            .attr("transform", "translate(" + gApp._rowHeight + "," + (gApp._rowHeight + (gApp._showReleaseHeader() ? gApp._rowHeight / 1.5 : 0) + (gApp._showIterationHeader() ? gApp._rowHeight / 1.5 : 0)) + ")")
            .attr("id", "zoomTree")
            .attr('width', +svg.attr('width') - gApp._rowHeight)
            .attr('height', +svg.attr('height'))
            .append('rect')
            .attr('width', +svg.attr('width') - gApp._rowHeight)
            .attr('height', +svg.attr('height'))
            .attr('class', 'arrowbox')
            .on('click', function () {
                if (gApp.viewportDays !== gApp.tlBack + gApp.tlAfter) {
                    gApp._initialiseScale();
                }
            });
    },

    _removeSVGTree: function () {
        if (d3.select("#zoomTree")) {
            d3.select("#zoomTree").remove();
        }

        gApp._removeCards();
    },

    _getPiHealthColor: function (record) {
        var type = gApp.down('#doneByEstimateCheckbox').getValue() ? 'PercentDoneByStoryPlanEstimate' : 'PercentDoneByStoryCount';
        var health = Rally.util.HealthColorCalculator.calculateHealthColorForPortfolioItemData(record, type);
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

    getCurrentView: function () {
        let ancestorData = gApp.ancestorFilterPlugin._getValue();
        delete ancestorData.piRecord;

        return {
            piTypeCombobox: gApp._getTopLevelTypePath(),
            scopeCombobox: gApp.down('#scopeCombobox').getValue(),
            axisStartDate: gApp.down('#axisStartDate').getValue(),
            axisEndDate: gApp.down('#axisEndDate').getValue(),
            axisLabels: {
                dates: gApp.down('#dateAxisCheckbox').getValue(),
                iterations: gApp._showIterationHeader(),
                releases: gApp._showReleaseHeader()
            },
            gridlines: {
                dates: gApp.down('#dateGridlineCheckbox').getValue(),
                iterations: gApp.down('#iterationGridlineCheckbox').getValue(),
                releases: gApp.down('#releaseGridlineCheckbox').getValue(),
                milestones: gApp.down('#milestoneGridlineCheckbox').getValue(),
                dependencies: gApp.down('#showDependenciesCheckbox').getValue(),
                today: gApp.down('#todayGridlineCheckbox').getValue()
            },
            rowLabels: gApp._getSelectedRowLabelId(),
            percentDone: gApp.down('#doneByEstimateCheckbox').checked ? 'doneByEstimateCheckbox' : 'doneByCountCheckbox',
            filters: gApp.ancestorFilterPlugin.getMultiLevelFilterStates(),
            ancestor: ancestorData
        };
    },

    setCurrentView: async function (view) {
        Ext.suspendLayouts();
        // Using 2 variables to track the upate of the timeline after setting view
        // and to stop the clearing of the view combobox when chart controls are updated
        // A sleeker way to accomplish this is out there, but time is short
        gApp.settingView = true;
        gApp.preventViewReset = true;
        gApp.down('#piTypeCombobox').setValue(view.piTypeCombobox);
        gApp.down('#scopeCombobox').setValue(view.scopeCombobox);
        gApp.down('#axisStartDate').setValue(new Date(view.axisStartDate));
        gApp.down('#axisEndDate').setValue(new Date(view.axisEndDate));
        gApp.down('#dateAxisCheckbox').setValue(view.axisLabels.dates);
        gApp.down('#iterationsCheckbox').setValue(view.axisLabels.iterations);
        gApp.down('#releasesCheckbox').setValue(view.axisLabels.releases);
        gApp.down('#dateGridlineCheckbox').setValue(view.gridlines.dates);
        gApp.down('#iterationGridlineCheckbox').setValue(view.gridlines.iterations);
        gApp.down('#releaseGridlineCheckbox').setValue(view.gridlines.releases);
        gApp.down('#milestoneGridlineCheckbox').setValue(view.gridlines.milestones);
        gApp.down('#showDependenciesCheckbox').setValue(view.gridlines.dependencies);
        gApp.down('#todayGridlineCheckbox').setValue(view.gridlines.today);
        gApp._setSelectedRowLabelId(view.rowLabels);
        gApp.down(`#${view.percentDone}`).setValue(true);
        gApp.ancestorFilterPlugin.setMultiLevelFilterStates(view.filters);

        if (gApp.ancestorFilterPlugin.piTypeSelector && view.ancestor.piTypePath) {
            await gApp.ancestorFilterPlugin._setPiSelector(view.ancestor.piTypePath, view.ancestor.pi);
        }

        gApp._updateAncestorTabText();

        setTimeout(async function () {
            gApp.down('#applyFiltersBtn').setDisabled(true);
            Ext.resumeLayouts(true);
            gApp.settingView = false;
            gApp.loadingTimeline = false;
            await gApp._refreshTimeline();
            gApp._setAxisDateFields(new Date(view.axisStartDate), new Date(view.axisEndDate));
            gApp.preventViewReset = false;
        }.bind(this), 800);
    },

    _getSelectedRowLabelId: function () {
        let radioId = 'showLabelsCheckbox';
        _.each(gApp.down('#piLabelGroup').items.items, function (labelRadio) {
            if (labelRadio.getValue()) {
                radioId = labelRadio.itemId;
            }
        });

        return radioId;
    },

    _setSelectedRowLabelId: function (id) {
        _.each(gApp.down('#piLabelGroup').items.items, function (labelRadio) {
            labelRadio.setValue(false);
        });

        gApp.down(`#${id}`).setValue(true);
    },

    initComponent: function () {
        this.callParent(arguments);
    }
});