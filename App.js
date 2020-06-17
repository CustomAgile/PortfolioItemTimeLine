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
        'Predecessors',
        'Successors',
        'PredecessorsAndSuccessors',
        'State',
        'Value',
        'PreliminaryEstimate',
        'OrderIndex',
        'PortfolioItemType',
        'Ordinal',
        'Release',
        'ReleaseStartDate',
        'ReleaseDate',
        '_type'
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
        'Predecessors',
        'Successors',
        'PredecessorsAndSuccessors',
        'ActualStartDate',
        'ActualEndDate',
        'State'
    ],

    items: [
        {
            xtype: 'container',
            itemId: 'mainContainer',
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
                },
                {
                    xtype: 'component',
                    cls: 'timelineLegend',
                    html: '<b><span class="legend-text">Legend</span></b><div><span class="legend-item planned"></span><span class="legend-text">Planned</span></div><div><span class="legend-item" style="background-color: #F66349"></span><span class="legend-text">Late</span></div><div><span class="legend-item" style="background-color: #FFC91C"></span><span class="legend-text">At Risk</span></div><div><span class="legend-item" style="background-color: #5CBA49"></span><span class="legend-text">On Track</span></div><div><span class="legend-item" style="background-color: #C0C0C0"></span><span class="legend-text">Complete</span></div>'
                }
            ]
        }
    ],

    _nodeTree: null,

    launch: function () {
        // gApp.stateId = gApp.getContext().getScopedStateId('PortfolioItemTimeline');
        gApp.ready = false;
        gApp.loadingTimeline = false;
        Rally.data.wsapi.Proxy.superclass.timeout = 240000;
        Rally.data.wsapi.batch.Proxy.superclass.timeout = 240000;
        gApp.client = new CustomAgileToolkit.Client('', { project: gApp.getContext().getProjectRef(), workspace: this.getContext().getWorkspaceRef(), maxConcurrentRequests: 8 });

        let width = gApp.getEl().getWidth();
        let height = gApp.getEl().getHeight();
        gApp.down('#mainContainer').add({
            xtype: 'rallybutton',
            text: 'cancel',
            itemId: 'cancelBtn',
            id: 'cancelBtn',
            style: `z-index:19500;position:absolute;top:${Math.round(height / 2) + 50}px;left:${Math.round(width / 2) - 30}px;width:60px;height:25px;`,
            hidden: true,
            handler: gApp._cancelLoading
        });

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

        gApp.tabPanel = gApp.down('#filterBox').add({
            xtype: 'tabpanel',
            cls: 'blue-tabs',
            activeTab: 2,
            plain: true,
            hideMode: 'offsets',
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
                    items: [{
                        xtype: 'container',
                        itemId: 'chartFilterButtonArea',
                        margin: 5,
                        layout: {
                            type: 'hbox',
                            align: 'middle',
                            defaultMargins: '0 15 15 0'
                        }
                    },
                    {
                        xtype: 'container',
                        itemId: 'chartFilterPanelArea',
                        margin: 5,
                        layout: {
                            type: 'hbox'
                        }
                    }]
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

        gApp.tabPanel.on('beforetabchange', (tabs, newTab) => {
            if (newTab.title.toLowerCase().indexOf('controls') > -1) {
                this.ancestorFilterPlugin.hideHelpButton();
            }
            else {
                this.ancestorFilterPlugin.showHelpButton();
            }
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
            gApp.loadingFailed = false;
            if (gApp.ancestorFilterPlugin._isSubscriber()) {
                gApp.advFilters = gApp.ancestorFilterPlugin.getMultiLevelFilters();
            }
            await gApp._updatePiTypeList();
            await gApp._addSharedViewsCombo();
            document.getElementById('timelineContainer').onscroll = gApp._timelineScrolled;
            gApp._updateFilterTabText();
            gApp._updateAncestorTabText();
            gApp.ready = true;
            if (gApp.loadingFailed) {
                gApp.setLoading(false);
                return;
            }
            gApp._refreshTimeline();
        }, 400);
    },

    _addAncestorPlugin: function () {
        gApp.down('#chartFilterButtonArea').add([
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
        ]);

        gApp.ancestorFilterPlugin = Ext.create('Utils.AncestorPiAppFilter', {
            ptype: 'UtilsAncestorPiAppFilter',
            pluginId: 'ancestorFilterPlugin',
            panelRenderAreaId: 'chartFilterPanelArea',
            btnRenderAreaId: 'chartFilterButtonArea',
            allowNoEntry: false,
            displayMultiLevelFilter: true,
            labelStyle: 'font-size: 14px',
            ownerLabel: '',
            ownerLabelWidth: 0,
            settingsConfig: {
                labelWidth: 150,
                padding: 10
            },
            listeners: {
                scope: gApp,
                ready: async function (plugin) {
                    if (gApp.ancestorFilterPlugin.renderArea.down('#ignoreScopeControl') && gApp.down('#scopeCombobox')) {
                        gApp.ancestorFilterPlugin.renderArea.down('#ignoreScopeControl').setValue(gApp.down('#scopeCombobox').getValue());
                    }

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
                    gApp.advFilters = await plugin.getMultiLevelFilters();
                    gApp.tabPanel.setActiveTab(0);
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
        gApp.loadingFailed = false;
        gApp._removeSVGTree();
        gApp._clearNodes();

        // Reset height so the loading mask shows properly
        var rs = gApp.down('#rootSurface');
        rs.getEl().setHeight(300);

        gApp.setLoading('Loading timeboxes...');
        gApp.loadingTimeline = true;
        gApp.cancelLoading = false;

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
        let width = gApp.getEl().getWidth();
        let height = gApp.getEl().getHeight();
        gApp.down('#cancelBtn').style = `z-index:19500;position:absolute;top:${Math.round(height / 2) + 50}px;left:${Math.round(width / 2) - 30}px;width:60px;height:25px;`;
        gApp.down('#cancelBtn').show();

        return new Promise(async function (resolve, reject) {
            try {
                if (gApp._isAncestorSelected()) {
                    // Ancestor plugin gives us the ref and typepath, so we need to fetch
                    // the actual record before proceeding
                    var piData = gApp.ancestorFilterPlugin._getValue();
                    let record = await gApp.client.get(piData.pi, null, { fetch: gApp.STORE_FETCH_FIELD_LIST });
                    if (record) {
                        record.id = 'root';
                        record._type = gApp.ancestorFilterPlugin._getValue().piTypePath;
                        gApp.expandData[0].expanded = true;
                        gApp._getChildArtifacts([record], resolve, reject);
                    }
                    else {
                        reject('Failed to fetch ancestor data');
                    }
                }
                // No ancestor selected, load all PIs starting at selected type
                else {
                    var topType = gApp._getTopLevelType();
                    if (topType) {
                        gApp.expandData[0].expanded = false;
                        gApp._getTopLevelArtifacts(topType, resolve, reject);
                    }
                }
            }
            catch (e) {
                reject(e);
            }
        }).then(
            // RESOLVE
            function () {
                gApp._removeChildlessNodes();

                if (!gApp._nodes.length || (gApp._nodes.length === 1 && gApp._nodes[0].Name === 'root')) {
                    gApp._showError('No Portfolio Items found with given filters and scoping');
                }
                else {
                    gApp._findDateRange();
                    gApp._recalculateTree();
                    if (!gApp._isAncestorSelected()) { gApp._collapseAll(); }
                }
            },
            // REJECT
            function (error) {
                console.warn(error);
                if (typeof error === 'string' && error.indexOf('Canceled Loading Timeline') !== -1) { return; }
                else {
                    gApp._showError(error, 'Failed while fetching portfolio items. Please reload and try again.');
                }
            }
        ).finally(function () {
            gApp.down('#cancelBtn').hide();
            gApp.setLoading(false);
            gApp.loadingTimeline = false;
        });
    },

    _cancelLoading: function () {
        gApp.cancelLoading = true;
        gApp.loadingTimeline = false;
        gApp.down('#cancelBtn').hide();
        gApp.setLoading(false);
    },

    _buildConfig: async function (type, parentRecords) {
        var context = gApp.getContext();
        var typePath = type.get('TypePath');
        let ord = type.get('Ordinal');
        var query;
        var project = null;
        var scopeAllProjects = gApp._getScopeAllProjects();
        var topLevelTypePath = gApp._getTopLevelTypePath();
        var pagesize = 200;
        var limit;

        if (gApp.getSetting('hideArchived')) {
            query = new Rally.data.wsapi.Filter({
                property: 'Archived',
                value: false
            });
        }

        // If scoping is set to all projects and we're retrieving the top level PIs
        // we  limit the results for performance reasons
        if (scopeAllProjects && typePath === topLevelTypePath) {
            if (ord === 0) {
                pagesize = 100;
                limit = 600;
            }
            else if (ord === 1) {
                pagesize = 70;
                limit = 70;
            }
            else if (ord === 2) {
                pagesize = 30;
                limit = 30;
            }
            else {
                pagesize = 15;
                limit = 15;
            }
        }
        else {
            if (ord === 0) {
                pagesize = 100;
            }
            else if (ord === 1) {
                pagesize = 10;
            }
            else {
                pagesize = 5;
            }
        }

        // If we're filtering with a list of parent IDs then we only need filters applied
        // to the current PI type
        let filters = [];
        if (parentRecords) {
            filters = await gApp.ancestorFilterPlugin.getFiltersOfSingleType(typePath);

            var parentIds = [];

            _.each(parentRecords, function (parent) {
                parentIds.push(parent.ObjectID);
            });

            let parentFilter = new Rally.data.wsapi.Filter({
                property: 'Parent.ObjectID',
                operator: 'in',
                value: parentIds
            });

            parentFilter.toString = function () { return '(Parent.ObjectID in ,' + parentIds.join(',') + ')'; };

            if (query) { query = query.and(parentFilter); }
            else { query = parentFilter; }
        }
        else {
            filters = await gApp.ancestorFilterPlugin.getMultiLevelFiltersForType(typePath, true).catch((e) => {
                gApp._showError(e, 'Failed while loading filters');
                gApp.loadingFailed = true;
            });
        }

        for (let i = 0; i < filters.length; i++) {
            if (query) { query = query.and(filters[i]); }
            else { query = filters[i]; }
        }

        if (!scopeAllProjects && typePath === topLevelTypePath) {
            project = context.getProjectRef();
        }

        var config = {
            project,
            projectScopeUp: context.getProjectScopeUp(),
            projectScopeDown: context.getProjectScopeDown(),
            enablePostGet: true,
            query: query ? query.toString() : "",
            order: 'DragAndDropRank',
            pagesize,
            limit,
            fetch: gApp.STORE_FETCH_FIELD_LIST
        };

        return Ext.clone(config);
    },

    _getChildArtifacts: async function (parents, resolve, reject) {
        if (gApp.cancelLoading) {
            reject('Canceled Loading Timeline');
        }
        else {
            if (parents && parents.length) {
                let promises = [];
                gApp._nodes = gApp._nodes.concat(gApp._createNodes(parents));

                if (parents.$hasMore) {
                    promises.push(new Promise(function (nextPageResolve, nextPageReject) {
                        parents.$getNextPage().then((newResults) => {
                            gApp._getChildArtifacts(newResults, nextPageResolve, nextPageReject);
                        });
                    }));
                }

                let type = gApp._findChildType(parents[0]);

                if (type) {
                    let config = await gApp._buildConfig(type, parents);

                    if (gApp.loadingFailed) {
                        reject('Failed while fetching filter data');
                        return;
                    }

                    promises.push(new Promise(function (newResolve, newReject) {
                        try {
                            gApp.client.query(type.get('TypePath'), config).then((results) => {
                                gApp._getChildArtifacts(results, newResolve, newReject);
                            });
                        }
                        catch (e) {
                            newReject(e);
                        }
                    }));
                }
                Promise.all(promises).then(resolve, function (e) { reject(e); });
            }
            else { resolve(); }
        }
    },

    _getTopLevelArtifacts: async function (topType, resolve, reject) {
        try {
            // When we scope across all projects, we limit the results returned for the top level, otherwise we'd return
            // far too many results. But if a lower level has a filter, we might not return the relevant top level results
            // that contain those filtered artifacts as children. As such, we need to get the filtered children first,
            // then figure out which parents are relevant
            let mustGetParents = false;
            let highestFilteredOrd = gApp._getHighestFilteredOrdinal();
            if (gApp._getScopeAllProjects() && highestFilteredOrd !== -1 && highestFilteredOrd < topType.get('Ordinal')) {
                topType = gApp._getTypeFromOrd(highestFilteredOrd);
                mustGetParents = true;
            }

            var config = await gApp._buildConfig(topType);

            if (gApp.loadingFailed) {
                reject('Failed while fetching filter data');
                return;
            }

            if (mustGetParents) {
                if (highestFilteredOrd === 0) {
                    config.limit = 2000;
                    config.pagesize = 2000;
                } else if (highestFilteredOrd === 1) {
                    config.limit = 500;
                    config.pagesize = 500;
                } else if (highestFilteredOrd === 2) {
                    config.limit = 250;
                    config.pagesize = 250;
                } else {
                    config.limit = 50;
                    config.pagesize = 50;
                }
            }

            if (gApp.cancelLoading) {
                reject('Canceled Loading Timeline');
            }
            else {
                gApp.client.query(topType.get('TypePath'), config).then(async (results) => {
                    if (!results.length) {
                        reject(`No Portfolio Items of type ${topType.get('Name')} found with given filters and scoping`);
                    }
                    else {
                        let rootRecord = {
                            id: 'root',
                            parent: null,
                            '_ref': 'root',
                            Parent: null,
                            ObjectID: 'root',
                            FormattedID: 'root',
                            _type: 'root'
                        };
                        gApp._nodes = gApp._createNodes([rootRecord]);

                        if (mustGetParents) {
                            topType = gApp._getParentType(topType);
                            let parentRecords = results;
                            let allParentRecords = [rootRecord];
                            let filterPasses = 0;

                            // For each level above the highest filtered level, get records by filtering on all parent Object IDs
                            // from the results of the level below
                            while (topType && topType.get('Ordinal') <= gApp._getTopLevelTypeOrdinal()) {
                                parentRecords = await gApp._getParentRecords(parentRecords, topType.get('TypePath'));
                                allParentRecords = allParentRecords.concat(parentRecords);
                                filterPasses++;

                                if (gApp.cancelLoading) {
                                    reject('Canceled Loading Timeline');
                                    return;
                                }
                                else {
                                    if (!parentRecords.length) {
                                        reject(`No Portfolio Items of type ${topType.get('Name')} found with given filters and scoping`);
                                        return;
                                    }
                                    else {
                                        if (topType.get('Ordinal') === gApp._getTopLevelTypeOrdinal()) {
                                            _.forEach(parentRecords, function (record) {
                                                record.Parent = { '_ref': 'root', 'ObjectID': 'root' };
                                            });
                                        }

                                        topType = gApp._getParentType(topType);
                                    }
                                }
                            }

                            // Not all artifacts will have parents all the way to the top level and must be removed
                            for (let pass = 0; pass < filterPasses; pass++) {
                                for (let i = 0; i < allParentRecords.length; i++) {
                                    let parentID = allParentRecords[i].Parent && allParentRecords[i].Parent.ObjectID;
                                    let toDelete = true;
                                    if (parentID) {
                                        for (let j = 0; j < allParentRecords.length; j++) {
                                            if (allParentRecords[j].ObjectID === parentID) {
                                                toDelete = false;
                                                break;
                                            }
                                        }
                                    }
                                    allParentRecords[i].toDelete = toDelete;
                                }
                            }

                            allParentRecords = _.filter(allParentRecords, (record) => { return !record.toDelete; });

                            // Now filter original result set
                            for (let i = 0; i < results.length; i++) {
                                let parentID = results[i].Parent && results[i].Parent.ObjectID;
                                let toDelete = true;
                                if (parentID) {
                                    for (let j = 0; j < allParentRecords.length; j++) {
                                        if (allParentRecords[j].ObjectID === parentID) {
                                            toDelete = false;
                                            break;
                                        }
                                    }
                                }
                                results[i].toDelete = toDelete;
                            }

                            results = _.filter(results, (record) => { return !record.toDelete; });
                            gApp._nodes = gApp._nodes.concat(gApp._createNodes(allParentRecords));
                        }
                        else {
                            _.forEach(results, function (record) {
                                record.Parent = { '_ref': 'root', ObjectID: 'root' };
                            });
                        }
                        gApp._getChildArtifacts(results, resolve, reject);
                    }
                });
            }
        }
        catch (e) {
            reject(e);
        }
    },

    _getParentRecords: async function (children, parentTypePath) {
        let resultsWithParents = _.filter(children, (artifact) => { return artifact.Parent && artifact.Parent.ObjectID; });
        let parentIDs = _.map(resultsWithParents, (artifact) => { return artifact.Parent.ObjectID; });
        parentIDs = _.uniq(parentIDs);

        let results = await gApp.client.query(parentTypePath, {
            project: null,
            enablePostGet: true,
            query: `(ObjectID in ,${parentIDs.join(',')})`,
            limit: Infinity,
            fetch: gApp.STORE_FETCH_FIELD_LIST
        }).then((results) => {
            return results;
        });

        return results;
    },

    _recalculateTree: function () {
        if (gApp._nodes.length === 0) { return; }
        gApp._rowHeight = gApp.getSetting('lineSize') || 40;
        var nodetree = gApp._createNodeTree();
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
            gApp._showError('End date must be greater than start date');
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
                .attr('x1', function (d) { return gApp.dateScaler(d.data.StartDate); })
                .attr('y1', topPadding)
                .attr('x2', function (d) { return gApp.dateScaler(d.data.StartDate); })
                .attr('y2', function () { return height; })
                .attr('class', 'iteration-line')
                .on('mouseover', function (d) {
                    let tipText = [
                        `Sprint: ${d.data.Name}`,
                        `Start Date: ${Rally.util.DateTime.format(d.data.StartDate, 'm-d-y')}`,
                        `End Date: ${Rally.util.DateTime.format(d.data.EndDate, 'm-d-y')}`
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
                .attr('x1', function (d) { return gApp.dateScaler(d.data.ReleaseStartDate); })
                .attr('y1', topPadding)
                .attr('x2', function (d) { return gApp.dateScaler(d.data.ReleaseStartDate); })
                .attr('y2', function () { return height; })
                .attr('class', 'release-line')
                .on('mouseover', function (d) {
                    let tipText = [
                        `Release: ${d.data.Name}`,
                        `Start Date: ${Rally.util.DateTime.format(d.data.ReleaseStartDate, 'm-d-y')}`,
                        `End Date: ${Rally.util.DateTime.format(d.data.ReleaseDate, 'm-d-y')}`
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
                .attr('x1', function (d) { return gApp.dateScaler(d.data.TargetDate); })
                .attr('y1', topPadding)
                .attr('x2', function (d) { return gApp.dateScaler(d.data.TargetDate); })
                .attr('y2', function () { return height; })
                .attr('class', 'milestone-line')
                .on('mouseover', function (d) {
                    let tipText = [
                        `${d.FormattedID}: ${d.data.Name}`,
                        `Target Date: ${Rally.util.DateTime.format(d.data.TargetDate, 'm-d-y')}`
                    ];
                    let tipId = `${d.data.FormattedID}-milestone-line`;

                    gApp._addHoverTooltip(this, 'milestone-line-hover', tipId, tipText, 250, 45);
                })
                .on('mouseout', function (d) {
                    d3.select(this).attr('class', 'milestone-line');
                    d3.select(`#${d.data.FormattedID}-milestone-line`).remove();
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
                .attr('id', function (d) { return 'release-' + d.data.Name; })
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
                .text(function (d) { return d.data.Name; })
                .attr('fill', 'black');
        }

        if (gApp._showIterationHeader()) {
            var iterations = gApp.gX.selectAll('.iterationNode')
                .data(gApp.iterations)
                .enter().append('g')
                .attr('class', 'iterationNode')
                .attr('id', function (d) { return 'iteration-' + d.data.Name; })
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
                .text(function (d) { return d.data.Name; })
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

        d3.selectAll('.dependency-item').remove();

        if (gApp.down('#showDependenciesCheckbox').getValue()) {
            gApp._nodeTree.each(function (d) {
                // Now add the dependencies lines
                if (!d.data.record.ObjectID) { return; }
                var deps = d.data.record.Successors;
                if (deps && deps.Count) {
                    gApp._getSuccessors(d.data.record).then(
                        {
                            success: function (succs) {
                                //Draw a circle on the end of the first one and make it flash if we can't find the end one
                                _.each(succs, function (succ) {
                                    var e = gApp._findTreeNode(gApp._getNodeTreeRecordId(succ));
                                    var zClass = 'dependency-item';
                                    var r = 3;
                                    var x0;
                                    var y0;
                                    var zoomTree = d3.select('#zoomTree');
                                    var source = d3.select('#rect-' + d.data.Name);

                                    if (!e) {
                                        zClass += ' textBlink';
                                    } else {
                                        zClass += gApp._getDependencyColorClass(d, e);
                                    }

                                    if (source.node()) {
                                        x0 = source.node().getCTM().e + source.node().getBBox().width - gApp._rowHeight;
                                        y0 = source.node().getCTM().f - topPadding + 5; // (gApp._rowHeight / 2) - gApp._rowHeight + 3 +

                                        if (zoomTree.select('#circle-' + d.data.Name).empty()) {
                                            zoomTree.append('circle')
                                                .attr('cx', x0)
                                                .attr('cy', y0)
                                                .attr('r', r)
                                                .attr('id', 'circle-' + d.data.Name)
                                                .on('click', function (a, idx, arr) {
                                                    gApp._createDepsPopover(d, arr[idx]);
                                                })    //Default to successors
                                                .attr('class', zClass + ' dependency-circle');
                                        }
                                    }

                                    if (e) {
                                        //Stuff that needs endpoint
                                        var target = d3.select('#rect-' + e.data.Name);

                                        if (target.node()) {
                                            var x1 = target.node().getCTM().e - gApp._rowHeight;
                                            var y1 = target.node().getCTM().f - topPadding + 5; // - (gApp._rowHeight / 2) - gApp._rowHeight + 3;

                                            zoomTree.append('circle')
                                                .attr('cx', x1)
                                                .attr('cy', y1)
                                                .attr('r', 3)
                                                .on('click', function (a, idx, arr) { gApp._createDepsPopover(e, arr[idx]); })    //Default to successors
                                                .attr('class', zClass + ' dependency-circle');

                                            zClass += (zClass.length ? ' ' : '') + 'dashed' + d.data.record.PortfolioItemType.Ordinal.toString();

                                            if (x0) {
                                                zoomTree.append('path')
                                                    .attr('d',
                                                        'M' + (x0 + 1.5) + ',' + y0 +
                                                        'C' + (x0 + 150) + ',' + (y0 + (y1 - y0) / 8) +
                                                        ' ' + (x1 - 150) + ',' + (y1 - (y1 - y0) / 8) +
                                                        ' ' + (x1 - 1.5) + ',' + y1)
                                                    .attr('class', zClass);
                                            }
                                        }
                                    }
                                });
                            }
                        }
                    );
                }
            });
        }

        gApp._timelineScrolled({ currentTarget: { scrollLeft: gApp.currentScrollX, scrollTop: document.getElementById('timelineContainer').scrollTop } });
    },

    // Called when user clicks on an item in the timeline
    // Sets the timeline view to the planned dates for that item
    _setViewportToPi: function (d) {
        let piPadding = 1;
        let start = d.data.record.PlannedStartDate;
        let end = d.data.record.PlannedEndDate;
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
            gApp._showError('End date must be greater than start date');
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
        if (document.getElementById('expandAllText')) {
            document.getElementById('expandAllText').setAttribute('x', gApp.currentScrollX);
        }
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
    },

    _viewportHasVerticalScroll: function () {
        let vp = document.getElementById('timelineContainer');
        return vp && vp.clientHeight !== vp.scrollHeight;
    },

    _getRemainingWindowHeight: function () {
        let filterHeight = gApp.down('#filterBox').getHeight();
        let controlsHeight = gApp.down('#piControlsContainer').getHeight();
        let appHeight = gApp.getHeight();

        return appHeight - filterHeight - controlsHeight - 50;
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
            timelineContainer.setScrollLeft(gApp.currentScrollX + Math.round((timelineWidth - gApp.previousTimelineWidth) / 1.8));
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
        try {
            if (endDate && typeof endDate === 'string') {
                endDate = Rally.util.DateTime.fromIsoString(endDate);
            }
            if (startDate && typeof startDate === 'string') {
                startDate = Rally.util.DateTime.fromIsoString(startDate);
            }
            return Rally.util.DateTime.getDifference(endDate, startDate, 'day');
        }
        catch (e) {
            return 0;
        }
    },

    _itemMenu: function (d) {
        Rally.nav.Manager.edit(d.data.record);
    },

    _getGroupClass: function (d) {
        var rClass = 'clickable draggable' + ((d.children || d._children) ? ' children' : '');
        if (gApp._checkSchedule(d)) {
            rClass += ' data--error';
        }
        return rClass;
    },

    _initIterationTranslate: function (d) {
        d.startX = new Date(d.data.StartDate);
        d.endX = new Date(d.data.EndDate);

        var x = gApp.dateScaler(d.startX);
        var e = gApp.dateScaler(d.endX);

        d.drawnX = x;
        d.drawnY = gApp._rowHeight + (gApp._showReleaseHeader() ? gApp._rowHeight / 1.5 : 0);
        d.drawnWidth = e - d.drawnX;
        d.drawnWidth = d.drawnWidth < 0 ? 0 : d.drawnWidth;
        d.translate = "translate(" + d.drawnX + "," + d.drawnY + ")";
    },

    _initReleaseTranslate: function (d) {
        d.startX = new Date(d.data.ReleaseStartDate);
        d.endX = new Date(d.data.ReleaseDate);

        var x = gApp.dateScaler(d.startX);
        var e = gApp.dateScaler(d.endX);

        d.drawnX = x;
        d.drawnY = gApp._rowHeight;
        d.drawnWidth = e - d.drawnX;
        d.drawnWidth = d.drawnWidth < 0 ? 0 : d.drawnWidth;
        d.translate = "translate(" + d.drawnX + "," + d.drawnY + ")";
    },

    _initGroupTranslate: function (d) {
        d.plannedStartX = new Date(d.data.record.PlannedStartDate);
        d.plannedEndX = new Date(d.data.record.PlannedEndDate);
        d.actualStartX = new Date(d.data.record.ActualStartDate);
        d.actualEndX = d.data.record.ActualEndDate ? new Date(d.data.record.ActualEndDate) : new Date();

        var plannedX = gApp.dateScaler(d.plannedStartX);
        var plannedE = gApp.dateScaler(d.plannedEndX);
        var actualX = gApp.dateScaler(d.actualStartX);
        var actualE = gApp.dateScaler(d.actualEndX);
        var svgHeight = gApp._getSVGHeight();

        d.plannedDrawnX = plannedX;
        d.plannedDrawnY = ((d.x0 * svgHeight) + (d.depth * gApp._rowHeight)) - gApp.rootHeight;
        d.plannedDrawnWidth = plannedE - d.plannedDrawnX;
        d.plannedDrawnWidth = d.plannedDrawnWidth < 1 ? 1 : d.plannedDrawnWidth;
        d.plannedTranslate = "translate(" + d.plannedDrawnX + "," + d.plannedDrawnY + ")";

        d.actualDrawnX = (actualX < 1 ? 1 : actualX);
        d.actualDrawnY = ((d.x0 * svgHeight) + (d.depth * gApp._rowHeight) + (gApp._rowHeight / 2)) - gApp.rootHeight;
        d.actualDrawnWidth = actualE - d.actualDrawnX;
        d.actualDrawnWidth = d.actualDrawnWidth < 1 ? 1 : d.actualDrawnWidth;
        d.actualTranslate = "translate(" + d.actualDrawnX + "," + d.actualDrawnY + ")";
    },

    _initTextRowTranslate: function (d) {
        var svgHeight = gApp._getSVGHeight();
        d.plannedDrawnY = ((d.x0 * svgHeight) + (d.depth * gApp._rowHeight)) - gApp.rootHeight;
        d.textDrawnX = 0;
        d.textTranslate = "translate(" + d.textDrawnX + "," + d.plannedDrawnY + ")";
    },

    _createSVGTree: function () {
        var symbolWidth = 20;
        gApp.rootHeight = gApp._shouldShowRoot() ? 0 : gApp._rowHeight;
        var nodetree = gApp._repartitionNodeTree(); // gApp._nodeTree || gApp._createNodeTree();
        gApp._setSVGDimensions(nodetree);
        gApp._initializeSVG();

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
                return d.data.record.ActualStartDate;
            })
            .append('rect')
            // Round bar for completed PIs, square for in-progress
            .attr('rx', function (d) { return d.data.record.ActualEndDate ? gApp._rowHeight / 8 : 0; })
            .attr('ry', function (d) { return d.data.record.ActualEndDate ? gApp._rowHeight / 8 : 0; })
            .attr('y', 3)
            .attr('width', function (d) { return d.actualDrawnWidth || 1; })
            .attr('height', gApp._rowHeight / 3.5)
            .attr('fill', function (d) {
                return d.data.record.ActualStartDate ? gApp._getPiHealthColor(d.data.record) : '#ffffff';
            })
            .attr('opacity', 1)
            .attr('class', 'clickable')
            .attr('id', function (d) { return 'rect-' + d.data.Name + '-actual'; });

        // Pecent done text
        actualRows.filter(function (d) { return d.data.record.ActualStartDate; })
            .append('text')
            .attr('x', function (d) { return d.actualDrawnWidth / 2; })
            .attr('y', gApp._rowHeight / 4 + 2)
            .attr('style', 'font-size:10')
            .text(function (d) {
                if (d.actualDrawnWidth) {
                    if (gApp.down('#doneByEstimateCheckbox').getValue()) {
                        return (d.data.record.PercentDoneByStoryPlanEstimate * 100).toFixed(0) + '%';
                    }
                    else {
                        return (d.data.record.PercentDoneByStoryCount * 100).toFixed(0) + '%';
                    }
                }
                return '';
            });

        // Planned date bars
        plannedRows.filter(function (d) {
            return d.data.record.PlannedStartDate && d.data.record.PlannedEndDate;
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
                if (!d3.event.altKey && d.data.record.PlannedStartDate && d.data.record.PlannedEndDate) {
                    gApp._setViewportToPi(d);
                }
            });

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
                if (!d3.event.altKey && d.data.record.PlannedStartDate && d.data.record.PlannedEndDate) {
                    gApp._setViewportToPi(d);
                }
            })
            .text(function (d) {
                let formattedID = d.data.record.FormattedID;
                let piName = d.data.record.Name;
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

    },

    _createDepsPopover: async function (node, circ) {
        // With the record returned via the toolkit, we can't successfully use the Rally Popover component
        // so easiest option is to first fetch the record via the Rally SDK
        let record = await this._fetchRecordById(node.data.record._type, node.data.record.ObjectID);

        if (record) {
            if (!record.data.PredecessorsAndSuccessors) {
                record.data.PredecessorsAndSuccessors = {
                    Predecessors: record.data.Predecessors.Count,
                    Successors: record.data.Successors.Count,
                    Count: record.data.Predecessors.Count + record.data.Successors.Count
                };
            }

            var panel = Ext.create('Rally.ui.popover.DependenciesPopover',
                {
                    record,
                    target: circ,
                    autoShow: false,
                    showChevron: false
                }
            );
            panel.show();
        }
    },

    _checkSchedule: function (d, start, end) {
        if (!d.parent || !d.parent.data.record.ObjectID || d.parent.id === 'root') {
            return false;
        }

        var childStart = (start === undefined) ? d.data.record.PlannedStartDate : start;
        var childEnd = (end === undefined) ? d.data.record.PlannedEndDate : end;

        return (childEnd > d.parent.data.record.PlannedEndDate) ||
            (childStart < d.parent.data.record.PlannedStartDate);
    },

    _getDependencyColorClass: function (a, b) {
        let predRelease = a && a.data && a.data.record && a.data.record.Release;
        let succRelease = b && b.data && b.data.record && b.data.record.Release;
        let noErrorCls = ' no--errors';
        let warningCls = ' data--warning';
        let errorCls = ' data--error';

        if (succRelease && !predRelease) {
            return errorCls;
        }
        else if (succRelease && predRelease) {
            if (succRelease.ReleaseDate === predRelease.ReleaseDate) {
                return warningCls;
            }
            else if (succRelease.ReleaseDate < predRelease.ReleaseDate) {
                return errorCls;
            }
        }
        return noErrorCls;
    },

    _getSuccessors: function (record) {
        var deferred = Ext.create('Deft.Deferred');

        Ext.Ajax.request({
            url: `${record.Successors._ref}?fetch=${gApp.STORE_FETCH_FIELD_LIST.join(',')}`,
            success(response) {
                if (response && response.responseText) {
                    let obj = Ext.JSON.decode(response.responseText);
                    // debugger;
                    if (obj && obj.QueryResult && obj.QueryResult.Results) {
                        deferred.resolve(obj.QueryResult.Results);
                    }
                    else {
                        deferred.resolve([]);
                    }
                } else {
                    deferred.resolve([]);
                }
            }
        });

        return deferred.promise;
    },

    _nodeMouseOut: function (node) {
        // if (node.data.card) { node.data.card.hide(); }
    },

    _nodeMouseOver: async function (node) {
        return;
        // if (!(node.data.record.ObjectID)) {
        //     //Only exists on real items, so do something for the 'unknown' item
        //     return;
        // } else {
        //     if (!node.data.card) {
        //         // let record = await this._fetchRecordById(node.data.record._type, node.data.record.ObjectID);
        //         var card = Ext.create('Rally.ui.cardboard.Card', {
        //             'record': node.data.record,
        //             fields: gApp.CARD_DISPLAY_FIELD_LIST,
        //             constrain: false,
        //             closable: true,
        //             width: gApp.MIN_COLUMN_WIDTH,
        //             height: 'auto',
        //             floating: true, // Allows us to control via the 'show' event
        //             shadow: false,
        //             showAge: true,
        //             resizable: true,
        //             plugins: [{ ptype: "rallycardpopover" }, {
        //                 ptype: "rallycardcontentleft"
        //             }, {
        //                 ptype: "rallycardcontentright"
        //             }],
        //             listeners: {
        //                 show: function (card) {
        //                     //Move card to one side, preferably closer to the center of the screen
        //                     var xpos = d3.event.clientX;
        //                     var ypos = d3.event.clientY;
        //                     card.el.setLeftTop((xpos - (this.getSize().width + 20)) < 0 ? (xpos + 20) : (xpos - (this.getSize().width + 20)),
        //                         (ypos + this.getSize().height) > gApp.getSize().height ? (gApp.getSize().height - (this.getSize().height + 20)) : (ypos + 10));  // Tree is rotated
        //                 }
        //             }
        //         });
        //         node.data.card = card;
        //     }
        //     node.data.card.show();
        // }
    },

    _nodePopup: function (node) {
        Ext.create('Rally.ui.popover.DependenciesPopover',
            {
                record: node.data.record, // TODO this is probably broken
                target: node.data.card.el
            }
        );
    },

    _nodeClick: function (node, index, array) {
        if (!(node.data.record.ObjectID)) { return; } //Only exists on real items
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

        // If user is a subscriber, update timeline, otherwise store the added filter
        if (gApp.ancestorFilterPlugin._isSubscriber()) {
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
        if (!gApp.ready) {
            return;
        }
        if (gApp.ancestorFilterPlugin && gApp.ancestorFilterPlugin.renderArea.down('#ignoreScopeControl') && gApp.down('#scopeCombobox')) {
            gApp.ancestorFilterPlugin.renderArea.down('#ignoreScopeControl').setValue(gApp.down('#scopeCombobox').getValue());
        }
        else {
            gApp._refreshTimeline();
        }
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
            sorters: [{
                property: 'Ordinal',
                direction: 'Desc'
            }],
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
                    gApp._showError('Error while loading portfolio item type store');
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
                    stateful: true,
                    stateId: gApp.getContext().getScopedStateId('portfolioitemtimeline-sharedviewcombo'),
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
            let planStart = node.record.PlannedStartDate;
            let actualStart = node.record.ActualStartDate;
            let planEnd = node.record.PlannedEndDate;
            let actualEnd = node.record.ActualEndDate;

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
                    if (!gApp._recordIsRoot(node) && node.record.PortfolioItemType.Ordinal === currentOrd) {
                        for (let isChild of gApp._nodes) {
                            // If we find a child node of current node, don't delete current node
                            if (!gApp._recordIsRoot(node) && !isChild.toDelete && isChild.record.Parent && isChild.record.Parent.ObjectID === node.record.ObjectID) {
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
            gApp._showError(e, 'Error while fetching releases');
        }
    },

    _getIterations: async function () {
        try {
            gApp.iterations = await gApp._getTimebox('Iteration', ['Name', 'StartDate', 'EndDate']);
        } catch (e) {
            gApp.iterations = [];
            gApp._showError(e, 'Error while fetching iterations');
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
            gApp._showError(e, 'Error while fetching milestones');
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
        var nodes = [];
        _.each(data, function (record) {
            gApp._convertRecordDates(record);

            record.get = function (fieldName) {
                return this[fieldName] || null;
            };
            // record.getId = function () {
            //     return this.ObjectID;
            // };
            // record.hasField = function () {
            //     return true;
            // };

            // isFieldVisible = function(fieldName) {
            //     var field = this[fieldName];

            //     return typeof field !== 'undefined' && !!field;
            // };
            // record.isCustomField = function (field) {
            //     return field.indexOf('c_') > -1;
            // };
            // record.getField = function (field) {
            //     return this[field];
            // };
            // record.self = record;

            nodes.push({ 'Name': record.FormattedID, 'record': record, 'dependencies': [] });
        });

        if (gApp._nodes.length > 1) {
            gApp.setLoading(`Loading portfolio items... (${gApp._nodes.length - 1} fetched so far)`);
        }

        return nodes;
    },

    // Custom Agile Toolkit returns Date fields as ISO strings so we convert them back to Date objects
    _convertRecordDates: function (record) {
        if (record.PlannedStartDate && typeof record.PlannedStartDate === 'string') {
            record.PlannedStartDate = Rally.util.DateTime.fromIsoString(record.PlannedStartDate);
        }
        if (record.PlannedEndDate && typeof record.PlannedEndDate === 'string') {
            record.PlannedEndDate = Rally.util.DateTime.fromIsoString(record.PlannedEndDate);
        }
        if (record.ActualStartDate && typeof record.ActualStartDate === 'string') {
            record.ActualStartDate = Rally.util.DateTime.fromIsoString(record.ActualStartDate);
        }
        if (record.ActualEndDate && typeof record.ActualEndDate === 'string') {
            record.ActualEndDate = Rally.util.DateTime.fromIsoString(record.ActualEndDate);
        }
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
            if (node.record && (node.record._ref === recordData._ref)) {
                returnNode = node;
            }
        });
        return returnNode;
    },

    _findNodeById: function (nodes, id) {
        return _.find(nodes, function (node) {
            return node.record._ref === id;
        });
    },

    _findParentNode: function (nodes, child) {
        if (child.record.ObjectID === 'root') { return null; }
        var parent = child.record.Parent;
        var pParent = null;
        if (parent) {
            //Check if parent already in the node list. If so, make this one a child of that one
            //Will return a parent, or null if not found
            pParent = gApp._findNode(nodes, parent);
        }
        else {
            //Here, there is no parent set, so attach to the 'null' parent.
            var pt = gApp._getParentType(gApp._findTypeByPath(child.record._type));
            //If we are at the top, we will allow d3 to make a root node by returning null
            //If we have a parent type, we will try to return the null parent for this type.
            if (pt) {
                var parentName = '/' + pt.get('TypePath') + '/null';
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

    _fetchRecordById: async function (type, id) {
        // var deferred = Ext.create('Deft.Deferred');
        let store = Ext.create('Rally.data.wsapi.Store', {
            model: type,
            autoLoad: false,
            pageSize: 1,
            fetch: gApp.STORE_FETCH_FIELD_LIST,
            filters: [{
                property: 'ObjectID',
                operator: '=',
                value: id
            }],
            context: { project: null },
        });

        let records = await store.load();

        return records && records.length ? records[0] : null;
        // return deferred.promise;
    },

    /*    Routines to manipulate the types    */

    _findTypeByOrdinal: function (ord) {
        return _.find(gApp._typeStore, function (type) { return type.get('Ordinal') === ord; });
    },

    _findTypeByPath: function (path) {
        return _.find(gApp._typeStore, function (type) { return type.get('TypePath') === path; });
    },

    _piTypeHasFilters: function (type) {
        _.each(gApp.advFilters, function (val, key) {
            if (type.toLowerCase() === key.toLowerCase()) {
                return !!val.length;
            }
        });
    },

    _getParentType: function (type) {
        var parentType = null;
        var parentOrd = type.get('Ordinal') + 1;
        _.each(gApp._typeStore, function (currentType) {
            if (currentType.get('Ordinal') === parentOrd) {
                parentType = currentType;
            }
        });
        return parentType;
    },

    _findChildType: function (record) {
        var ord = null;
        for (var i = 0; i < gApp._typeStore.length; i++) {
            if (record._type.toLowerCase() === gApp._typeStore[i].get('TypePath').toLowerCase()) {
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

    _getScopeAllProjects: function () {
        return gApp.down('#scopeCombobox').getValue();
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

    _getHighestFilteredOrdinal() {
        var highestOrdinal = -1;
        if (gApp.advFilters) {
            _.each(gApp.advFilters, function (filter, key) {
                if (filter.length) {
                    let ord = gApp._getOrdFromTypePath(key);
                    if (ord !== null && ord > highestOrdinal) {
                        highestOrdinal = ord;
                    }
                }
            });
        }

        return highestOrdinal;
    },

    _getTypeFromOrd: function (ord) {
        var type = null;
        _.each(gApp._typeStore, function (currentType) { if (ord === currentType.get('Ordinal')) { type = currentType; } });
        return type;
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
        return record._ref;
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

    _createNodeTree: function () {
        try {
            gApp._nodeTree = gApp._stratifyNodeTree(gApp._nodes).sum(function () { return 1; });
            return gApp._repartitionNodeTree();
        }
        catch (e) {
            gApp._showError(e);
            console.error(e.stack);
        }
        return null;
    },

    _repartitionNodeTree: function () {
        try {
            var partition = d3.partition();
            gApp._nodeTree.sum(function () { return 1; });
            gApp._nodeTree = partition(gApp._nodeTree);
            return gApp._nodeTree;
        }
        catch (e) {
            gApp._showError(e);
            console.error(e.stack);
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
        if (gApp.gX) { gApp.gX.remove(); }

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
        var exportTree = gApp._createNodeTree();
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
        if (exportTree.data && exportTree.data.record && exportTree.data.record.ObjectID !== 'root') {
            var nodeData = [];
            _.each(dataKeys, function (key) {
                var val = exportTree.data.record[key];
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

    _showError(msg, defaultMessage) {
        Rally.ui.notify.Notifier.showError({ message: this.parseError(msg, defaultMessage) });
    },

    parseError(e, defaultMessage) {
        defaultMessage = defaultMessage || 'An unknown error has occurred';

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
            scopeCombobox: gApp._getScopeAllProjects(),
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
        gApp.setLoading('Loading View...');
        Ext.suspendLayouts();
        // Using 2 variables to:
        // - Track the upate of the timeline after setting view
        // - Stop the clearing of the view combobox when chart controls are updated
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

        if (gApp.ancestorFilterPlugin.renderArea.down('#ignoreScopeControl')) {
            gApp.ancestorFilterPlugin.renderArea.down('#ignoreScopeControl').setValue(view.scopeCombobox);
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
        }.bind(this), 2000);
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