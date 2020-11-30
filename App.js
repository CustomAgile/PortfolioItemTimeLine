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

    getSettingsFields() {
        let returned = [
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
        'Children',
        'ObjectID',
        'Project',
        'DisplayName',
        'Owner',
        'PercentDoneByStoryCount',
        'PercentDoneByStoryPlanEstimate',
        'Predecessors',
        'Successors',
        'Milestones',
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

    launch() {
        this.ready = false;
        this.loadingTimeline = false;
        Rally.data.wsapi.Proxy.superclass.timeout = 240000;
        Rally.data.wsapi.batch.Proxy.superclass.timeout = 240000;

        let width = this.getEl().getWidth();
        let height = this.getEl().getHeight();

        this.down('#mainContainer').add({
            xtype: 'rallybutton',
            text: 'cancel',
            itemId: 'cancelBtn',
            id: 'cancelBtn',
            style: `z-index:19500;position:absolute;top:${Math.round(height / 2) + 50}px;left:${Math.round(width / 2) - 30}px;width:60px;height:25px;`,
            hidden: true,
            handler: () => this._cancelLoading()
        });

        this.down('#piControlsContainer').add({
            xtype: 'container',
            id: 'piTypeContainer',
            layout: { type: 'hbox', align: 'middle' }
        });

        this.tabPanel = this.down('#filterBox').add({
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
                        layout: { type: 'hbox' }
                    }]
                }
            ]
        });

        // this.tabPanel.on('beforetabchange', (tabs, newTab) => {
        //     if (newTab.title.toLowerCase().indexOf('controls') > -1) {
        //         this.ancestorFilterPlugin.hideHelpButton();
        //     }
        //     else {
        //         this.ancestorFilterPlugin.showHelpButton();
        //     }
        // });

        this.down('#filterBox').on('resize', () => this._setTimelineHeight());
        this._addAncestorPlugin();
    },

    async _kickOff() {
        // variable to bind to the expand/collapse all button on timeline
        this.expandData = [{ expanded: true }];
        this._typeStore = this.ancestorFilterPlugin.portfolioItemTypes;

        let childTypes = this._getTypeList(this._highestOrdinal() - 1);
        let childModels = [];
        _.each(childTypes, model => childModels.push(model.Type));

        this.tabPanel.child('#chartControlsTab').add({
            xtype: 'chartControls',
            cmp: this
        });

        setTimeout(async () => {
            this.loadingFailed = false;
            this.advFilters = this.ancestorFilterPlugin.getMultiLevelFilters();
            await this._updatePiTypeList();
            await this._addSharedViewsCombo();
            document.getElementById('timelineContainer').onscroll = (e) => this._timelineScrolled(e);
            this._updateFilterTabText();
            this.ready = true;
            if (this.loadingFailed) {
                this.setLoading(false);
                return;
            }
            this._refreshTimeline();
        }, 400);
    },

    _addAncestorPlugin() {
        this.down('#chartFilterButtonArea').add([
            {
                xtype: 'rallybutton',
                itemId: 'applyFiltersBtn',
                handler: () => this._applyFilters(),
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

        this.ancestorFilterPlugin = Ext.create('Utils.AncestorPiAppFilter', {
            ptype: 'UtilsAncestorPiAppFilter',
            pluginId: 'ancestorFilterPlugin',
            renderAreaId: 'chartFilterButtonArea',
            panelRenderAreaId: 'chartFilterPanelArea',
            btnRenderAreaId: 'chartFilterButtonArea',
            allowNoEntry: false,
            displayMultiLevelFilter: true,
            labelStyle: 'font-size: 14px',
            ownerLabel: '',
            ownerLabelWidth: 0,
            disableAncestorFilter: true,
            settingsConfig: {
                labelWidth: 150,
                padding: 10
            },
            listeners: {
                scope: this,
                ready: async plugin => {
                    plugin.addListener({
                        scope: this,
                        select: () => this._onAncestorFilterChange(),
                        change: () => this._onFilterChange()
                    });

                    if (this.ancestorFilterPlugin._isSubscriber()) {
                        this.down('#applyFiltersBtn').hide();
                        this.down('#chartFiltersTab').hide();
                        this.down('#subscriberFilterIndicator').show();
                    }
                    this.advFilters = await plugin.getMultiLevelFilters();
                    this.tabPanel.setActiveTab(0);
                    this._kickOff();
                },
                single: true
            }
        });
        this.addPlugin(this.ancestorFilterPlugin);
    },

    async _refreshTimeline() {
        // Lots of listeners and events. Lets ensure the timeline only loads once
        if (this.loadingTimeline || this.settingView || !this.ready) { return; }
        let promises = [];
        this.loadingFailed = false;
        this._removeSVGTree();
        this._clearNodes();

        // Reset height so the loading mask shows properly
        let rs = this.down('#rootSurface');
        rs.getEl().setHeight(300);

        this.setLoading('Loading timeboxes...');
        this.loadingTimeline = true;
        this.cancelLoading = false;

        if (!this.defaultProjectID) {
            await this._getDefaultProjectID();
        }

        if (!this.releases) {
            promises.push(this._getReleases());
        }

        if (!this.iterations) {
            promises.push(this._getIterations());
        }

        if (!this.milestones) {
            promises.push(this._getMilestones());
        }

        if (promises.length) {
            await Promise.all(promises).catch((e) => {
                this._showError(e, 'Failure while fetching timebox data');
                this.loadingFailed = true;
            });
        }

        if (this.loadingFailed) { return; }

        this.setLoading('Loading portfolio items...');
        let width = this.getEl().getWidth();
        let height = this.getEl().getHeight();
        this.down('#cancelBtn').style = `z-index:19500;position:absolute;top:${Math.round(height / 2) + 50}px;left:${Math.round(width / 2) - 30}px;width:60px;height:25px;`;
        this.down('#cancelBtn').show();

        return new Promise(async (resolve, reject) => {
            try {
                let topType = this._getTopLevelType();
                if (topType) {
                    this.expandData[0].expanded = false;
                    this._getTopLevelArtifacts(topType, resolve, reject);
                }
            }
            catch (e) { reject(e); }
        }).then(
            // RESOLVE
            () => {
                this._removeChildlessNodes();

                if (!this._nodes.length || (this._nodes.length === 1 && this._nodes[0].Name === 'root')) {
                    this._showError('No Portfolio Items found with given filters and scoping');
                }
                else {
                    this._findDateRange();
                    this._recalculateTree();
                    if (!this._isAncestorSelected()) { this._collapseAll(); }
                }
            },
            // REJECT
            (error) => {
                if (typeof error === 'string' && error.indexOf('Canceled Loading Timeline') !== -1) { return; }
                else {
                    this._showError(error, 'Failed while fetching portfolio items. Please reload and try again.');
                }
            }
        ).finally(() => {
            this.down('#cancelBtn').hide();
            this.setLoading(false);
            this.loadingTimeline = false;
        });
    },

    _cancelLoading() {
        this.cancelLoading = true;
        this.loadingTimeline = false;
        this.down('#cancelBtn').hide();
        this.setLoading(false);
    },

    async _buildConfig(type, parentRecords) {
        let context = this.getContext().getDataContext();
        let typePath = type.get('TypePath');
        let ord = type.get('Ordinal');
        let filters = [];
        let scopeAllProjects = this._getScopeAllProjects();
        let topLevelTypePath = this._getTopLevelTypePath();
        let pageSize = 200;
        let limit = Infinity;

        if (scopeAllProjects || typePath !== topLevelTypePath) {
            context.project = null;
        }

        if (this.getSetting('hideArchived')) {
            filters.push(new Rally.data.wsapi.Filter({
                property: 'Archived',
                value: false
            }));
        }

        // If scoping is set to all projects and we're retrieving the top level PIs
        // we  limit the results for performance reasons
        if (scopeAllProjects && typePath === topLevelTypePath) {
            if (ord === 0) {
                pageSize = 100;
                limit = 600;
            }
            else if (ord === 1) {
                pageSize = 70;
                limit = 70;
            }
            else if (ord === 2) {
                pageSize = 30;
                limit = 30;
            }
            else {
                pageSize = 15;
                limit = 15;
            }
        }

        // If we're filtering with a list of parent IDs then we only need filters applied
        // to the current PI type
        if (parentRecords) {
            let multiFilters = await this.ancestorFilterPlugin.getFiltersOfSingleType(typePath).catch((e) => {
                this._showError(e, 'Failed while loading multi level project filters');
                this.loadingFailed = true;
            });

            filters = multiFilters ? filters.concat(multiFilters) : filters;
        }
        else {
            let multiFilters = await this.ancestorFilterPlugin.getMultiLevelFiltersForType(typePath, true).catch((e) => {
                this._showError(e, 'Failed while loading filters');
                this.loadingFailed = true;
            });

            let prjFilters = await this.ancestorFilterPlugin.getProjectsAsFilters().catch((e) => {
                this._showError(e, 'Failed while loading multi level project filters');
                this.loadingFailed = true;
            });

            filters = multiFilters && prjFilters ? filters.concat([...prjFilters, ...multiFilters]) : filters;
        }

        let config = {
            model: typePath,
            context,
            filters,
            pageSize,
            limit,
            autoLoad: false,
            enablePostGet: true,
            sorters: [{ property: 'DragAndDropRank' }],
            fetch: this.STORE_FETCH_FIELD_LIST
        };

        return Ext.clone(config);
    },

    async _getChildArtifacts(parents, resolve, reject) {
        if (this.cancelLoading) {
            reject('Canceled Loading Timeline');
        }
        else {
            if (parents && parents.length) {
                this._nodes = this._nodes.concat(this._createNodes(parents));

                let type = this._findChildType(parents[0]);

                if (type) {
                    let promises = [];
                    let config = await this._buildConfig(type, parents);

                    if (this.loadingFailed) {
                        reject('Failed while fetching filter data');
                        return;
                    }

                    try {
                        for (let parent of parents) {
                            promises.push(new Promise((newResolve, newReject) => {
                                this.wrapPromise(parent.getCollection('Children', config).load())
                                    .then(results => this._getChildArtifacts(results, newResolve, newReject))
                                    .catch(e => newReject(e));
                            }));
                        }

                        Promise.all(promises).then(() => resolve(), (e) => reject(e))
                            .catch(e => reject(e));
                    }
                    catch (e) { reject(e); }
                }
                else { resolve(); }
            }
            else { resolve(); }
        }
    },

    async _getTopLevelArtifacts(topType, resolve, reject) {
        try {
            // When we scope across all projects, we limit the results returned for the top level, otherwise we'd return
            // far too many results. But if a lower level has a filter, we might not return the relevant top level results
            // that contain those filtered artifacts as children. As such, we need to get the filtered children first,
            // then figure out which parents are relevant
            let mustGetParents = false;
            let highestFilteredOrd = this._getHighestFilteredOrdinal();
            if (this._getScopeAllProjects() && highestFilteredOrd !== -1 && highestFilteredOrd < topType.get('Ordinal')) {
                topType = this._getTypeFromOrd(highestFilteredOrd);
                mustGetParents = true;
            }

            let config = await this._buildConfig(topType);

            if (this.loadingFailed) {
                reject('Failed while fetching filter data');
                return;
            }

            if (mustGetParents) {
                if (highestFilteredOrd === 0) {
                    config.limit = 2000;
                    config.pageSize = 2000;
                } else if (highestFilteredOrd === 1) {
                    config.limit = 500;
                    config.pageSize = 500;
                } else if (highestFilteredOrd === 2) {
                    config.limit = 250;
                    config.pageSize = 250;
                } else {
                    config.limit = 50;
                    config.pageSize = 50;
                }
            }

            if (this.cancelLoading) {
                reject('Canceled Loading Timeline');
                return;
            }

            let artifactStore = Ext.create('Rally.data.wsapi.Store', config);
            let results = await this.wrapPromise(artifactStore.load());

            if (!results.length) {
                reject(`No Portfolio Items of type ${topType.get('Name')} found with given filters and scoping`);
                return;
            }

            let rootRecord = {
                id: 'root',
                parent: null,
                '_ref': 'root',
                Parent: null,
                ObjectID: 'root',
                FormattedID: 'root',
                _type: 'root'
            };

            this._nodes = this._createNodes([rootRecord]);

            if (mustGetParents) {
                topType = this._getParentType(topType);
                let parentRecords = results;
                let allParentRecords = [rootRecord];
                let filterPasses = 0;

                // For each level above the highest filtered level, get records by filtering on all parent Object IDs
                // from the results of the level below
                while (topType && topType.get('Ordinal') <= this._getTopLevelTypeOrdinal()) {
                    parentRecords = await this._getParentRecords(parentRecords, topType.get('TypePath'));
                    allParentRecords = allParentRecords.concat(parentRecords);
                    filterPasses++;

                    if (this.cancelLoading) {
                        reject('Canceled Loading Timeline');
                        return;
                    }
                    else {
                        if (!parentRecords.length) {
                            reject(`No Portfolio Items of type ${topType.get('Name')} found with given filters and scoping`);
                            return;
                        }
                        else {
                            if (topType.get('Ordinal') === this._getTopLevelTypeOrdinal()) {
                                _.forEach(parentRecords, record => {
                                    record.set('Parent', { '_ref': 'root', 'ObjectID': 'root' });
                                });
                            }

                            topType = this._getParentType(topType);
                        }
                    }
                }

                // Not all artifacts will have parents all the way to the top level and must be removed
                for (let pass = 0; pass < filterPasses; pass++) {
                    for (let i = 0; i < allParentRecords.length; i++) {
                        let parentID = allParentRecords[i].get('Parent') && allParentRecords[i].get('Parent').ObjectID;
                        let toDelete = true;
                        if (parentID) {
                            for (let parent of allParentRecords) {
                                if (parent.get('ObjectID') === parentID) {
                                    toDelete = false;
                                    break;
                                }
                            }
                        }
                        allParentRecords[i].toDelete = toDelete;
                    }
                }

                allParentRecords = _.filter(allParentRecords, r => !r.toDelete);

                // Now filter original result set
                for (let record of results) {
                    let parentID = record.get('Parent') && record.get('Parent').ObjectID;
                    let toDelete = true;
                    if (parentID) {
                        for (let parent of allParentRecords) {
                            if (parent.get('ObjectID') === parentID) {
                                toDelete = false;
                                break;
                            }
                        }
                    }
                    record.toDelete = toDelete;
                }

                results = _.filter(results, r => !r.toDelete);
                this._nodes = this._nodes.concat(this._createNodes(allParentRecords));
            }
            else {
                _.forEach(results, record => record.set('Parent', { '_ref': 'root', ObjectID: 'root' }));
            }
            this._getChildArtifacts(results, resolve, reject);
        }
        catch (e) {
            reject(e);
        }
    },

    async _getParentRecords(children, parentTypePath) {
        let resultsWithParents = _.filter(children, artifact => artifact.get('Parent') && artifact.get('Parent').ObjectID);
        let parentIDs = _.uniq(_.map(resultsWithParents, artifact => artifact.get('Parent').ObjectID));
        let context = this.getContext().getDataContext();
        context.project = null;

        let parentStore = Ext.create('Rally.data.wsapi.Store', {
            model: parentTypePath,
            context,
            enablePostGet: true,
            filters: [{ property: 'ObjectID', operator: 'in', value: parentIDs }],
            pageSize: 200,
            limit: Infinity,
            fetch: this.STORE_FETCH_FIELD_LIST
        });

        let results = await this.wrapPromise(parentStore.load());

        return results;
    },

    _recalculateTree() {
        if (this._nodes.length === 0) { return; }
        this._rowHeight = this.getSetting('lineSize') || 40;
        let nodetree = this._createNodeTree();
        if (!nodetree) { return; }

        this._setSVGDimensions(nodetree);
        this._initialiseScale();
    },

    _initialiseScale() {
        this.viewportDays = this.tlBack + this.tlAfter;
        this._setAxisDateFields(this.tlStart, this.tlEnd);
    },

    // Used to set both axis dates without triggering the redraw twice
    _setAxisDateFields(start, end) {
        if (end < start) {
            this._showError('End date must be greater than start date');
            return;
        }

        let startDateField = this.down('#axisStartDate');
        let endDateField = this.down('#axisEndDate');

        startDateField.suspendEvents(false);
        endDateField.suspendEvents(false);

        startDateField.setValue(start);
        endDateField.setValue(end);

        startDateField.resumeEvents();
        endDateField.resumeEvents();

        this._redrawTree();
    },

    _setTimeScaler(timebegin, timeend) {
        this.dateScaler = d3.scaleTime()
            .domain([timebegin, timeend])
            .range([0, parseInt(d3.select('#rootSurface').attr('width')) - (this._rowHeight + 10)]);
    },

    _redrawTree() {
        if (this.settingView || !this._timelineHasItems()) { return; }

        this._clearSharedViewCombo();
        this._setZoomButtons();
        this._removeSVGTree();
        this._createSVGTree();
        this._setAxis();
        this.currentScrollX = document.getElementById('timelineContainer').scrollLeft;
        this._updateRowLabelLocations();
    },

    _setAxis() {
        if (this.settingView || !this._timelineHasItems()) { return; }

        this._clearSharedViewCombo();

        if (this.gX) { this.gX.remove(); }

        let that = this;
        let svg = d3.select('#rootSurface');
        let width = +svg.attr('width');
        let height = +svg.attr('height');
        let viewportWidth = this.down('#timelineContainer').getEl().getWidth();
        let viewportPercentage = width / viewportWidth;
        let showCalendarTicks = this.down('#dateGridlineCheckbox').getValue();
        let topPadding = 35;
        topPadding += this._showReleaseHeader() ? 25 : 0;
        topPadding += this._showIterationHeader() ? 26 : 0;

        this.xAxis = d3.axisBottom(this.dateScaler)
            .ticks(viewportPercentage * 8)
            .tickSize(showCalendarTicks ? height : 0)
            .tickPadding(showCalendarTicks ? 22 - height : 22);
        this.gX = svg.append('g');

        this.gX.append('rect')
            .attr('width', width - (this._rowHeight + 10))
            .attr('height', this._rowHeight + (this._showIterationHeader() && this._showReleaseHeader() ? this._rowHeight : 0))
            .attr('fill', 'white');

        this.gX.attr('transform', 'translate(' + this._rowHeight + ',0)')
            .attr('id', 'axisBox')
            .attr('width', width - (this._rowHeight + 10))
            .attr('height', height)
            .attr('class', 'axis')
            .call(this.xAxis);

        if (showCalendarTicks) {
            d3.selectAll('.tick line').attr('y1', topPadding);
        }

        if (!this.down('#dateAxisCheckbox').getValue()) {
            d3.selectAll('.tick text').attr('y', -50);
        }

        if (this.iterations && this.iterations.length && this.down('#iterationGridlineCheckbox').getValue()) {
            this.gX.selectAll('iterationticks')
                .data(this.iterations)
                .enter().append('line')
                .attr('x1', function (d) { return that.dateScaler(d.data.StartDate); })
                .attr('y1', topPadding)
                .attr('x2', function (d) { return that.dateScaler(d.data.StartDate); })
                .attr('y2', () => height)
                .attr('class', 'iteration-line')
                .on('mouseover', function (d) {
                    let tipText = [
                        `Sprint: ${d.data.Name}`,
                        `Start Date: ${Rally.util.DateTime.format(d.data.StartDate, 'm-d-y')}`,
                        `End Date: ${Rally.util.DateTime.format(d.data.EndDate, 'm-d-y')}`
                    ];
                    let tipId = 'tooltip-iteration-line';

                    that._addHoverTooltip(this, 'iteration-line-hover', tipId, tipText, 160, 60);
                })
                .on('mouseout', function () {
                    d3.select(this).attr('class', 'iteration-line');
                    d3.select('#tooltip-iteration-line').remove();
                });
        }

        if (this.down('#releaseGridlineCheckbox').getValue()) {
            this.gX.selectAll('releaseticks')
                .data(this.releases)
                .enter().append('line')
                .attr('x1', d => this.dateScaler(d.data.ReleaseStartDate))
                .attr('y1', topPadding)
                .attr('x2', d => this.dateScaler(d.data.ReleaseStartDate))
                .attr('y2', () => height)
                .attr('class', 'release-line')
                .on('mouseover', function (d) {
                    let tipText = [
                        `Release: ${d.data.Name}`,
                        `Start Date: ${Rally.util.DateTime.format(d.data.ReleaseStartDate, 'm-d-y')}`,
                        `End Date: ${Rally.util.DateTime.format(d.data.ReleaseDate, 'm-d-y')}`
                    ];
                    let tipId = 'tooltip-release-line';

                    that._addHoverTooltip(this, 'release-line-hover', tipId, tipText, 160, 60);
                })
                .on('mouseout', function () {
                    d3.select(this).attr('class', 'release-line');
                    d3.select('#tooltip-release-line').remove();
                });
        }

        if (this.milestones && this.milestones.length && this.down('#milestoneGridlineCheckbox').getValue()) {
            this.milestoneXAxisHash = {};
            this.gX.selectAll('milestoneticks')
                .data(this.milestones)
                .enter().append('line')
                .attr('x1', d => {
                    let x = this.dateScaler(d.data.TargetDate);
                    this.milestoneXAxisHash[d.data.FormattedID] = x;
                    return x;
                })
                .attr('y1', topPadding)
                .attr('x2', d => this.dateScaler(d.data.TargetDate))
                .attr('y2', () => height)
                .attr('class', 'milestone-line')
                .on('mouseover', function (d) {
                    let tipText = [
                        `${d.data.FormattedID}: ${d.data.Name}`,
                        `Target Date: ${Rally.util.DateTime.format(d.data.TargetDate, 'm-d-y')}`
                    ];
                    let tipId = `${d.data.FormattedID}-milestone-line`;

                    that._addHoverTooltip(this, 'milestone-line-hover', tipId, tipText, 250, 45);
                })
                .on('mouseout', function (d) {
                    d3.select(this).attr('class', 'milestone-line');
                    d3.select(`#${d.data.FormattedID}-milestone-line`).remove();
                });

            let tree = d3.select('#zoomTree');

            this._nodeTree.each(d => {
                if (!d.data.record.ObjectID) { return; }
                let milestones = d.data.record.Milestones;

                if (milestones && milestones.Count) {
                    for (let m of milestones._tagsNameArray) {
                        let milestoneX = this.milestoneXAxisHash[m.FormattedID];
                        if (milestoneX) {
                            tree.append('path')
                                .attr('d', d3.symbol().type(d3.symbolDiamond).size(this._rowHeight * 3)())
                                .attr('fill', m.DisplayColor || '#D1D1D1')
                                .attr('transform', () => {
                                    return `translate(${milestoneX},${d.plannedDrawnY + (this._rowHeight / 4)})`;
                                });
                        }
                    }
                }
            });
        }

        if (this.down('#todayGridlineCheckbox').getValue()) {
            this.gX.append('line')
                .attr('x1', () => this.dateScaler(new Date()))
                .attr('y1', topPadding)
                .attr('x2', () => this.dateScaler(new Date()))
                .attr('y2', () => height)
                .attr('class', 'today-line')
                .on('mouseover', function () {
                    that._addHoverTooltip(this, 'today-line-hover', 'todayLineTooltip', ['Today'], 48, 25);
                })
                .on('mouseout', function () {
                    d3.select(this).attr('class', 'today-line');
                    d3.select('#todayLineTooltip').remove();
                });
        }

        if (this._showReleaseHeader()) {
            let releases = this.gX.selectAll(".releaseNode")
                .data(this.releases)
                .enter().append("g")
                .attr('class', 'releaseNode')
                .attr('id', d => 'release-' + d.data.Name)
                .attr('transform', d => {
                    this._initReleaseTranslate(d);
                    return d.translate;
                });

            // Release bars
            releases.append('rect')
                .attr('width', d => d.drawnWidth)
                .attr('height', this._rowHeight / 2)
                .attr('fill', '#f2f2f2')
                .attr('stroke', '#808080')
                .attr('stroke-opacity', 0.5);

            // Release Name
            releases.append('text')
                .attr('x', d => d.drawnWidth / 2)
                .attr('y', this._rowHeight / 4 + 3)
                .text(d => d.data.Name)
                .attr('fill', 'black');
        }

        if (this._showIterationHeader()) {
            let iterations = this.gX.selectAll('.iterationNode')
                .data(this.iterations)
                .enter().append('g')
                .attr('class', 'iterationNode')
                .attr('id', d => 'iteration-' + d.data.Name)
                .attr('transform', d => {
                    this._initIterationTranslate(d);
                    return d.translate;
                });

            // Iteration bars
            iterations.append('rect')
                .attr('width', d => d.drawnWidth)
                .attr('height', this._rowHeight / 2)
                .attr('fill', '#f2f2f2')
                .attr('stroke', '#808080')
                .attr('stroke-opacity', 0.5);

            // Iteration Name
            iterations.append('text')
                .attr('x', d => d.drawnWidth / 2)
                .attr('y', this._rowHeight / 4 + 3)
                .text(d => d.data.Name)
                .attr('fill', 'black');
        }

        // Expand / Collapse all
        this.gX.selectAll('.expandAll')
            .data(this.expandData)
            .enter().append('g')
            .append('text')
            .attr('id', 'expandAllText')
            .attr('x', 0)
            .attr('y', 25)
            .attr('class', d => { return 'icon-gear app-menu ' + (d.expanded ? 'collapse-arrow' : 'expand-arrow'); })
            .attr('alignment-baseline', 'central')
            .text(d => { return d.expanded ? '9' : '7'; })
            .on('click', d => {
                d.expanded = !d.expanded;
                if (!d.expanded) { this._collapseAll(); } else { this._expandAll(); }
            });

        d3.selectAll('.dependency-item').remove();

        if (this.down('#showDependenciesCheckbox').getValue()) {
            this._nodeTree.each(d => {
                // Now add the dependencies lines
                if (!d.data.record.ObjectID) { return; }
                let deps = d.data.record.Successors;
                if (deps && deps.Count) {
                    d.data.record.getSuccessors().then(
                        {
                            success: succs => {
                                //Draw a circle on the end of the first one and make it flash if we can't find the end one
                                _.each(succs, succ => {
                                    let e = this._findTreeNode(this._getNodeTreeRecordId(succ.data));
                                    let zClass = 'dependency-item';
                                    let r = 3;
                                    let x0;
                                    let y0;
                                    let zoomTree = d3.select('#zoomTree');
                                    let source = d3.select('#rect-' + d.data.Name);

                                    if (!e) {
                                        zClass += ' textBlink';
                                    } else {
                                        zClass += this._getDependencyColorClass(d, e);
                                    }

                                    if (source.node()) {
                                        x0 = source.node().getCTM().e + source.node().getBBox().width - this._rowHeight;
                                        y0 = source.node().getCTM().f - topPadding + 5;

                                        if (zoomTree.select('#circle-' + d.data.Name).empty()) {
                                            zoomTree.append('circle')
                                                .attr('cx', x0)
                                                .attr('cy', y0)
                                                .attr('r', r)
                                                .attr('id', 'circle-' + d.data.Name)
                                                .on('click', (a, idx, arr) => {
                                                    this._createDepsPopover(d, arr[idx]);
                                                })    //Default to successors
                                                .attr('class', zClass + ' dependency-circle');
                                        }
                                    }

                                    if (e) {
                                        //Stuff that needs endpoint
                                        let target = d3.select('#rect-' + e.data.Name);

                                        if (target.node()) {
                                            let x1 = target.node().getCTM().e - this._rowHeight;
                                            let y1 = target.node().getCTM().f - topPadding + 5;

                                            zoomTree.append('circle')
                                                .attr('cx', x1)
                                                .attr('cy', y1)
                                                .attr('r', 3)
                                                .on('click', (a, idx, arr) => { this._createDepsPopover(e, arr[idx]); })    //Default to successors
                                                .attr('class', zClass + ' dependency-circle');

                                            zClass += (zClass.length ? ' ' : '') + 'dep-path dashed' + d.data.record.PortfolioItemType.Ordinal.toString();

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

        this._timelineScrolled({ currentTarget: { scrollLeft: this.currentScrollX, scrollTop: document.getElementById('timelineContainer').scrollTop } });
    },

    // Called when user clicks on an item in the timeline
    // Sets the timeline view to the planned dates for that item
    _setViewportToPi(d) {
        let piPadding = 1;
        let start = d.data.record.PlannedStartDate;
        let end = d.data.record.PlannedEndDate;
        let viewportStartInDays = this._daysBetween(start, this.tlStart);
        viewportStartInDays -= viewportStartInDays > 5 ? piPadding : 0;

        this.viewportDays = this._daysBetween(end, start) + piPadding * 4;
        this._redrawTree();
        this.down('#timelineContainer').getEl().setScrollLeft(this._getViewportScaler() * viewportStartInDays);
    },

    _addHoverTooltip(hoverEl, hoverElClass, tipId, tipText, width, height) {
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

        _.each(tipText, newLine => {
            textObj.append('tspan')
                .attr('x', width / 2)
                .attr('dy', '1.3em')
                .text(newLine);
        });

        d3.select(hoverEl).attr('class', hoverElClass);
    },

    _clearSharedViewCombo() {
        if (!this.preventViewReset) {
            this.down('#timelineSharedViewCombobox').setValue(null);
        }
    },

    _resetAxis() {
        this._findDateRange();
        this._initialiseScale();
    },

    _resetView() {
        this._clearSharedViewCombo();

        this.loadingTimeline = true;
        this.ancestorFilterPlugin._clearAllFilters();
        let clearFilters = this.ancestorFilterPlugin.getMultiLevelFilterStates();

        this.viewportDays = this.tlBack + this.tlAfter;

        this.setCurrentView({
            piTypeCombobox: this._getTopLevelTypePath(),
            axisStartDate: this.tlStart,
            axisEndDate: this.tlEnd,
            axisLabels: {
                dates: this.getSetting('calendarOverlay'),
                iterations: this.getSetting('iterationOverlay'),
                releases: this.getSetting('releaseOverlay')
            },
            gridlines: {
                dates: this.getSetting('calendarGridlines'),
                iterations: this.getSetting('iterationGridlines'),
                releases: this.getSetting('releaseGridlines'),
                milestones: this.getSetting('milestoneGridlines'),
                dependencies: this.getSetting('dependencyStrings'),
                today: this.getSetting('todayGridline')
            },
            rowLabels: 'showLabelsCheckbox',
            percentDone: 'doneByEstimateCheckbox',
            filters: clearFilters,
            ancestor: {
                ignoreProjectScope: false,
                isPiSelected: false,
                pi: null,
                piTypePath: this.ancestorFilterPlugin._defaultPortfolioItemType()
            }
        });
    },

    _onAxisDateChange(dateField, isValid) {
        if (!isValid) { return; }

        let axisStart = this.down('#axisStartDate');
        let startDate = axisStart.getValue();

        let axisEnd = this.down('#axisEndDate');
        let endDate = axisEnd.getValue();

        if (endDate < startDate) {
            this._showError('End date must be greater than start date');
            return;
        }

        this.tlStart = startDate;
        this.tlEnd = endDate;
        this._redrawTree();
    },

    _timelineHasItems() {
        if (!this._nodes || !this._nodes.length) {
            return false;
        }
        else if (this._nodes.length === 1 && this._nodes[0].Name === 'root') {
            return false;
        }
        return true;
    },

    // Called when the user scrolls the timeline
    // Translates the portfolio item labels so they remain on the left side of the screen
    _timelineScrolled(e) {
        let x = e.currentTarget.scrollLeft;
        let y = e.currentTarget.scrollTop;

        // Scrolling vertically
        if (x === this.currentScrollX) {
            d3.select('#axisBox').attr('transform', `translate(${this._rowHeight},${y})`);
        }
        else {
            this.currentScrollX = x;
            this._updateRowLabelLocations();
        }
    },

    _updateRowLabelLocations() {
        d3.select('#rowLabelGroup').attr('transform', `translate(${this.currentScrollX},0)`);
        if (document.getElementById('expandAllText')) {
            document.getElementById('expandAllText').setAttribute('x', this.currentScrollX);
        }
    },

    _zoom(zoomIn) {
        let timelineDays = this._daysBetween(this.tlEnd, this.tlStart);
        let zoomVal = this._getZoomValue();

        this.viewportDays = zoomIn ?
            _.max([this.maxZoom, this.viewportDays - zoomVal]) :
            _.min([timelineDays, this.viewportDays + zoomVal]);

        this._setZoomButtons();
        this._redrawTree();
    },

    _setZoomButtons() {
        this.down('#zoomInBtn').setDisabled(this.viewportDays === this.maxZoom);
        this.down('#zoomOutBtn').setDisabled(this.viewportDays === this._daysBetween(this.tlEnd, this.tlStart));
    },

    _getZoomValue() {
        return Math.round(this.viewportDays * this.zoomFactor);
    },

    _switchChildren(d) {
        if (d.children) { this._collapse(d); }
        else { this._expand(d); }
        this._redrawTree();
    },

    _collapse(d) {
        if (d.children) {
            d._children = d.children;
            d.children = null;
            d._value = d.value;
            d.value = 1;
        }
    },

    _expand(d) {
        if (d._children) {
            d.children = d._children;
            d._children = null;
            d.value = d._value;
            d._value = 1;
        }
    },

    _collapseAll() {
        if (this.expandables) {
            this.expandables.each(d => { this._collapse(d); });
        } else {
            d3.selectAll('.collapse-icon').dispatch('collapseAll');
        }
        this._redrawTree();
    },

    _collapseChildren(d) {
        if (d && d.length) {
            _.each(d, c => {
                this._collapseChildren(c._children);
                this._collapse(c);
            });
        }
    },

    _expandChildren(d) {
        if (d && d.length) {
            _.each(d, c => {
                this._expandChildren(c._children);
                this._expand(c);
            });
        }
    },

    _expandAll() {
        if (this.expandables) {
            this.expandables.each(d => {
                this._expandChildren(d._children);
                this._expand(d);

            });
            this._redrawTree();
        } else {
            for (let i = 0; i < this._getTopLevelTypeOrdinal(); i++) {
                d3.selectAll('.collapse-icon').dispatch('expandAll');
                this._redrawTree();
            }
        }
    },

    _viewportHasVerticalScroll() {
        let vp = document.getElementById('timelineContainer');
        return vp && vp.clientHeight !== vp.scrollHeight;
    },

    _getRemainingWindowHeight() {
        let filterHeight = this.down('#filterBox').getHeight();
        let controlsHeight = this.down('#piControlsContainer').getHeight();
        let appHeight = this.getHeight();

        return appHeight - filterHeight - controlsHeight - 50;
    },

    _setTimelineHeight() {
        this.down('#timelineContainer').setHeight(this._getRemainingWindowHeight());
    },

    _getSVGHeight() {
        return parseInt(d3.select('#rootSurface').attr('height')) - this._rowHeight;
    },

    _setSVGDimensions(nodetree) {
        let svg = d3.select('#rootSurface');
        let rs = this.down('#rootSurface');
        let timelineContainer = this.down('#timelineContainer').getEl();
        let viewportWidth = timelineContainer.getWidth();
        let viewportScaler = this._getViewportScaler();
        let timelineWidth = viewportScaler === 1 ? viewportWidth - 20 : this._daysBetween(this.tlEnd, this.tlStart) * viewportScaler;

        svg.attr('height', this._rowHeight * (nodetree.value + 1 + (this._showReleaseHeader() ? 1 : 0) + (this._showIterationHeader() ? 1 : 0)));
        rs.getEl().setHeight(svg.attr('height'));
        rs.getEl().setWidth(timelineWidth);
        svg.attr('width', timelineWidth);
        svg.attr('class', 'rootSurface');

        if (this.currentScrollX && this.previousTimelineWidth) {
            timelineContainer.setScrollLeft(this.currentScrollX + Math.round((timelineWidth - this.previousTimelineWidth) / 1.8));
        }
        else {
            timelineContainer.setScrollLeft((this._daysBetween(new Date(), this.tlStart) - this._daysBetween(new Date(), Ext.Date.subtract(new Date(), Ext.Date.DAY, this.tlBack))) * viewportScaler);
        }

        this.previousTimelineWidth = timelineWidth;
        this._setTimeScaler(this.tlStart, this.tlEnd);
    },

    // Returns the number of pixels per day given the current
    // viewport width and number of days to show in the viewport
    _getViewportScaler() {
        let viewportWidth = this.down('#timelineContainer').getEl().getWidth();
        if (this._viewportHasVerticalScroll()) {
            viewportWidth -= 15;
        }
        return (Math.round(viewportWidth / (this.viewportDays || 1))) || 1;
    },

    _daysBetween(endDate, startDate) {
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

    _itemMenu(d) {
        Rally.nav.Manager.edit(d.data.record);
    },

    _getGroupClass(d) {
        let rClass = 'clickable draggable' + ((d.children || d._children) ? ' children' : '');
        if (this._checkSchedule(d)) {
            rClass += ' data--error';
        }
        return rClass;
    },

    _initIterationTranslate(d) {
        d.startX = new Date(d.data.StartDate);
        d.endX = new Date(d.data.EndDate);

        let x = this.dateScaler(d.startX);
        let e = this.dateScaler(d.endX);

        d.drawnX = x;
        d.drawnY = this._rowHeight + (this._showReleaseHeader() ? this._rowHeight / 1.5 : 0);
        d.drawnWidth = e - d.drawnX;
        d.drawnWidth = d.drawnWidth < 0 ? 0 : d.drawnWidth;
        d.translate = "translate(" + d.drawnX + "," + d.drawnY + ")";
    },

    _initReleaseTranslate(d) {
        d.startX = new Date(d.data.ReleaseStartDate);
        d.endX = new Date(d.data.ReleaseDate);

        let x = this.dateScaler(d.startX);
        let e = this.dateScaler(d.endX);

        d.drawnX = x;
        d.drawnY = this._rowHeight;
        d.drawnWidth = e - d.drawnX;
        d.drawnWidth = d.drawnWidth < 0 ? 0 : d.drawnWidth;
        d.translate = "translate(" + d.drawnX + "," + d.drawnY + ")";
    },

    _initGroupTranslate(d) {
        d.plannedStartX = new Date(d.data.record.PlannedStartDate);
        d.plannedEndX = new Date(d.data.record.PlannedEndDate);
        d.actualStartX = new Date(d.data.record.ActualStartDate);
        d.actualEndX = d.data.record.ActualEndDate ? new Date(d.data.record.ActualEndDate) : new Date();

        let plannedX = this.dateScaler(d.plannedStartX);
        let plannedE = this.dateScaler(d.plannedEndX);
        let actualX = this.dateScaler(d.actualStartX);
        let actualE = this.dateScaler(d.actualEndX);
        let svgHeight = this._getSVGHeight();

        d.plannedDrawnX = plannedX;
        d.plannedDrawnY = ((d.x0 * svgHeight) + (d.depth * this._rowHeight)) - this.rootHeight;
        d.plannedDrawnWidth = plannedE - d.plannedDrawnX;
        d.plannedDrawnWidth = d.plannedDrawnWidth < 1 ? 1 : d.plannedDrawnWidth;
        d.plannedTranslate = "translate(" + d.plannedDrawnX + "," + d.plannedDrawnY + ")";

        d.actualDrawnX = (actualX < 1 ? 1 : actualX);
        d.actualDrawnY = ((d.x0 * svgHeight) + (d.depth * this._rowHeight) + (this._rowHeight / 2)) - this.rootHeight;
        d.actualDrawnWidth = actualE - d.actualDrawnX;
        d.actualDrawnWidth = d.actualDrawnWidth < 1 ? 1 : d.actualDrawnWidth;
        d.actualTranslate = "translate(" + d.actualDrawnX + "," + d.actualDrawnY + ")";
    },

    _initTextRowTranslate(d) {
        let svgHeight = this._getSVGHeight();
        d.plannedDrawnY = ((d.x0 * svgHeight) + (d.depth * this._rowHeight)) - this.rootHeight;
        d.textDrawnX = 0;
        d.textTranslate = "translate(" + d.textDrawnX + "," + d.plannedDrawnY + ")";
    },

    _createSVGTree() {
        let symbolWidth = 20;
        this.rootHeight = this._shouldShowRoot() ? 0 : this._rowHeight;
        let nodetree = this._repartitionNodeTree(); // this._nodeTree || this._createNodeTree();
        this._setSVGDimensions(nodetree);
        this._initializeSVG();

        let rows = d3.select('#zoomTree').selectAll(".node")
            .data(nodetree.descendants())
            .enter().filter(d => { return d.data.record.id === "root" ? this._shouldShowRoot() : true; })
            .append("g");

        // Create planned groups
        let plannedRows = rows.append("g").attr('class', (d) => this._getGroupClass(d))
            .attr('id', d => { return 'group-' + d.data.Name; })
            .attr('transform', d => {
                this._initGroupTranslate(d);
                return d.plannedTranslate;
            });

        // Create actuals groups
        let actualRows = rows.append("g")
            .attr('id', d => { return 'group-' + d.data.Name + '-actual'; })
            .attr('transform', d => {
                return d.actualTranslate;
            });

        // Display colored bars for actuals
        actualRows
            .filter(d => {
                return d.data.record.ActualStartDate;
            })
            .append('rect')
            // Round bar for completed PIs, square for in-progress
            .attr('rx', d => { return d.data.record.ActualEndDate ? this._rowHeight / 8 : 0; })
            .attr('ry', d => { return d.data.record.ActualEndDate ? this._rowHeight / 8 : 0; })
            .attr('y', 3)
            .attr('width', d => { return d.actualDrawnWidth || 1; })
            .attr('height', this._rowHeight / 3.5)
            .attr('fill', d => {
                return d.data.record.ActualStartDate ? this._getPiHealthColor(d.data.record) : '#ffffff';
            })
            .attr('opacity', 1)
            .attr('class', 'clickable')
            .attr('id', d => { return 'rect-' + d.data.Name + '-actual'; });

        // Pecent done text
        actualRows.filter(d => { return d.data.record.ActualStartDate; })
            .append('text')
            .attr('x', d => { return d.actualDrawnWidth / 2; })
            .attr('y', this._rowHeight / 4 + 2)
            .attr('style', 'font-size:10')
            .text(d => {
                if (d.actualDrawnWidth) {
                    if (this.down('#doneByEstimateCheckbox').getValue()) {
                        return (d.data.record.PercentDoneByStoryPlanEstimate * 100).toFixed(0) + '%';
                    }
                    else {
                        return (d.data.record.PercentDoneByStoryCount * 100).toFixed(0) + '%';
                    }
                }
                return '';
            });

        // Planned date bars
        plannedRows.filter(d => {
            return d.data.record.PlannedStartDate && d.data.record.PlannedEndDate;
        })
            .append('rect')
            .attr('id', d => { return 'rect-' + d.data.Name; })
            .attr('rx', this._rowHeight / 6)
            .attr('ry', this._rowHeight / 6)
            .attr('width', d => { return d.plannedDrawnWidth; })
            .attr('height', this._rowHeight / 2)
            .attr('fill', d => { return this.colours[d.depth + 1]; })
            .attr('opacity', 0.5)
            .attr('class', 'clickable')
            .on('click', d => {
                if (!d3.event.altKey && d.data.record.PlannedStartDate && d.data.record.PlannedEndDate) {
                    this._setViewportToPi(d);
                }
            });

        let labelGroup = d3.select('#zoomTree').append('g')
            .attr('id', 'rowLabelGroup');

        let labelGroupRows = labelGroup.selectAll('.textRows')
            .data(nodetree.descendants())
            .enter().filter(d => { return d.data.record.id === "root" ? this._shouldShowRoot() : true; })
            .append("g")
            .attr('class', d => { return 'timelineRowText' + ((d.children || d._children) ? ' childrenText' : ''); })
            .attr('transform', d => {
                this._initTextRowTranslate(d);
                return d.textTranslate;
            });

        // Triple bar symbol (hamburger button)
        labelGroupRows.append('text')
            .attr('y', this._rowHeight / 4)
            .attr('x', d => { return 5 - d.textDrawnX + (d.depth * 10); })
            .attr('alignment-baseline', 'central')
            .text('V')
            .attr('class', 'icon-gear app-menu')
            .on('click', d => { this._itemMenu(d); });

        // PI ID and Name text
        labelGroupRows.append('text')
            .attr('id', d => { return 'text-' + d.data.Name; })
            .attr('x', d => { return symbolWidth + 5 - d.textDrawnX + (d.depth * 10); })
            .attr('y', this._rowHeight / 4)  //Should follow point size of font
            .attr('class', 'clickable normalText')
            .attr('editable', 'none')
            .attr('alignment-baseline', 'central')
            .attr('style', 'font-size:12')
            .on('click', d => {
                if (!d3.event.altKey && d.data.record.PlannedStartDate && d.data.record.PlannedEndDate) {
                    this._setViewportToPi(d);
                }
            })
            .text(d => {
                let formattedID = d.data.record.FormattedID;
                let piName = d.data.record.Name;
                if (this.down('#idOnlyCheckbox').getValue()) {
                    return formattedID;
                }
                else if (this.down('#shortenLabelsCheckbox').getValue() && piName.length > 20) {
                    piName = piName.substring(0, 20) + '...';
                }
                return `${formattedID}: ${piName}`;
            });

        // Expand / Collapse arrows
        this.expandables = d3.selectAll('.childrenText').append('text')
            .attr('x', d => { return -(symbolWidth + d.textDrawnX) + (d.depth * 10); })
            .attr('y', this._rowHeight / 4)
            .attr('class', d => { return 'icon-gear app-menu collapse-icon ' + (d.children ? 'collapse-arrow' : 'expand-arrow'); })
            .attr('alignment-baseline', 'central')
            .text(d => { return d.children ? '9' : '7'; })
            .on('click', (d, idx, arr) => { this._switchChildren(d, idx, arr); })
            .on('collapseAll', d => { this._collapse(d); })
            .on('expandAll', d => { this._expand(d); });

    },

    async _createDepsPopover(node, circ) {
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

            let panel = Ext.create('Rally.ui.popover.DependenciesPopover',
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

    _checkSchedule(d, start, end) {
        if (!d.parent || !d.parent.data.record.ObjectID || d.parent.id === 'root') {
            return false;
        }

        let childStart = (start === undefined) ? d.data.record.PlannedStartDate : start;
        let childEnd = (end === undefined) ? d.data.record.PlannedEndDate : end;

        return (childEnd > d.parent.data.record.PlannedEndDate) ||
            (childStart < d.parent.data.record.PlannedStartDate);
    },

    _getDependencyColorClass(a, b) {
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

    _nodePopup(node) {
        Ext.create('Rally.ui.popover.DependenciesPopover',
            {
                record: node.data.record, // TODO this is probably broken
                target: node.data.card.el
            }
        );
    },

    _nodeClick(node, index, array) {
        if (!(node.data.record.ObjectID)) { return; } //Only exists on real items
        //Get ordinal (or something ) to indicate we are the lowest level, then use "UserStories" instead of "Children"
        if (event.altKey) {
            this._nodePopup(node, index, array);
        }
    },

    _nodes: [],

    onSettingsUpdate() {
        setTimeout(this._refreshTimeline, 500);
    },

    async _onAncestorFilterChange() {
        // If user is a subscriber, update timeline, otherwise store the added filter
        if (this.ancestorFilterPlugin._isSubscriber()) {
            this._applyFilters();
        }
        else {
            this.down('#applyFiltersBtn').setDisabled(false);
        }
        this._clearSharedViewCombo();


    },

    onTimeboxScopeChange(newTimebox) {
        this.callParent(arguments);
        this.timeboxScope = newTimebox;
        this._refreshTimeline();
    },

    _onFilterChange(filters) {
        this.advFilters = filters;
        this._updateFilterTabText();

        // If user is a subscriber, update timeline, otherwise store the added filter
        if (this.ancestorFilterPlugin._isSubscriber()) {
            this._applyFilters();
        }
        else {
            this.down('#applyFiltersBtn').setDisabled(false);
        }

        this._clearSharedViewCombo();
    },

    _onTopLevelPIChange() {
        this._refreshTimeline();
    },


    _onRowLabelChange(radio, newValue) {
        // Called twice when selected new radio button
        // We want to redraw the tree on the second handler
        // once both radio buttons have finished updating values
        if (newValue) { return; }
        this._redrawTree();
    },

    _updateFilterTabText() {
        let totalFilters = 0;
        _.each(this.advFilters, filter => {
            totalFilters += filter.length;
        });

        let titleText = totalFilters ? `FILTERS (${totalFilters})` : 'FILTERS';
        let tab = this.tabPanel.child('#chartFiltersTab');

        if (tab) { tab.setTitle(titleText); }
    },

    _hasFilters() {
        if (!this.advFilters) { return false; }

        let hasFilters = false;

        _.each(this.advFilters, filter => {
            if (filter.length) {
                hasFilters = true;
            }
        });

        return hasFilters;
    },

    _onTypeChange() {
        this._refreshTimeline();
    },

    _onGridlinesChanged() {
        if (this.ready) {
            this._setAxis();
        }
    },

    _applyFilters() {
        this.down('#applyFiltersBtn').setDisabled(true);
        this._refreshTimeline();
    },

    _toggleHideAncestorFilter() {
        this.ancestorFilterPlugin.renderArea.animate({
            to: { width: this.ancestorFilterPlugin.renderArea.getWidth() ? 0 : '100%' }
        });
    },

    // When an ancestor is selected, we need to filter out PI types that are
    // above the selected ancestor since the project scoping wouldn't apply
    _updatePiTypeList() {
        let container = this.down('#piTypeContainer');
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

        if (this._isAncestorSelected()) {
            config.filters.push({
                property: 'Ordinal',
                operator: '<=',
                value: this._getAncestorTypeOrdinal()
            });
        }

        return new Promise((resolve, reject) => {
            // Load store first to avoid ridiculous 'getRecord of null' error
            let piStore = Ext.create('Rally.data.wsapi.Store', config);
            piStore.load().then({
                success: () => {
                    container.add({
                        xtype: 'rallyportfolioitemtypecombobox',
                        itemId: 'piTypeCombobox',
                        stateful: true,
                        stateId: this.getContext().getScopedStateId('CustomAgile.PortfolioItemTimeline.topLevelPIType'),
                        stateEvents: ['select'],
                        store: piStore,
                        fieldLabel: 'PI Type',
                        labelStyle: 'font-size: 14px',
                        labelWidth: 70,
                        valueField: 'TypePath',
                        allowNoEntry: false,
                        defaultSelectionPosition: 'first',
                        listeners: {
                            scope: this,
                            change: () => {
                                this._onTopLevelPIChange();
                            },
                            ready: () => {
                                resolve();
                            }
                        },
                        // Disable the preference enabled combo box plugin so that this control value is app specific
                        plugins: []
                    });
                },
                failure: () => {
                    this._showError('Error while loading portfolio item type store');
                    reject();
                },
                scope: this
            });
        });
    },

    _addSharedViewsCombo() {
        return new Promise((resolve) => {
            this.down('#piControlsContainer').add([
                {
                    xtype: 'rallysharedviewcombobox',
                    title: 'Shared Views',
                    itemId: 'timelineSharedViewCombobox',
                    stateful: true,
                    stateId: this.getContext().getScopedStateId('portfolioitemtimeline-sharedviewcombo'),
                    enableUrlSharing: true,
                    context: this.getContext(),
                    cmp: this,
                    listeners: {
                        ready: (combo) => {
                            combo.setValue(null);
                            resolve();
                        }
                    }
                },
                {
                    xtype: 'rallybutton',
                    text: 'Reset View',
                    itemId: 'resetViewBtn',
                    handler: () => this._resetView()
                }
            ]);
        });
    },

    // Iterate through the nodes and find the earliest planned or actual start date and
    // latest planned or actual end date in order to set the range for the timeline
    _findDateRange() {
        // These min/max years are used to filter out bad data (I saw a PlannedStartDate of 06/01/0019...)
        let minYear = 2000;
        let maxYear = 2200;
        let maxDate = new Date('01/01/' + minYear);
        let minDate = new Date('12/01/' + maxYear);

        _.each(this._nodes, node => {
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

        this.tlStart = minDate.getFullYear() === maxYear ? Ext.Date.subtract(new Date(), Ext.Date.DAY, this.tlBack) : minDate;
        this.tlEnd = maxDate <= new Date() ? Ext.Date.add(new Date(), Ext.Date.DAY, this.tlAfter) : maxDate;
    },

    // Since we're filtering on a specific PI type, we want to scan through all types above the
    // lowest filtered type and remove PIs that have no children so the end user has a cleaner view 
    // of PIs that they care about
    _removeChildlessNodes() {
        if (!this._nodes || !this._hasFilters()) { return; }

        let toDelete = true;
        let currentOrd = this._getLowestFilteredOrdinal() + 1;
        let maxOrd = (this._isAncestorSelected() ? this._getAncestorTypeOrdinal() - 1 : this._getTopLevelTypeOrdinal());

        while (currentOrd <= maxOrd) {
            let currentType = this._findTypeByOrdinal(currentOrd);

            if (currentType) {
                _.each(this._nodes, node => {
                    if (!this._recordIsRoot(node) && node.record.PortfolioItemType.Ordinal === currentOrd) {
                        for (let isChild of this._nodes) {
                            // If we find a child node of current node, don't delete current node
                            if (!this._recordIsRoot(node) && !isChild.toDelete && isChild.record.Parent && isChild.record.Parent.ObjectID === node.record.ObjectID) {
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

        this._nodes = _.filter(this._nodes, node => !node.toDelete);
    },

    _recordIsRoot(record) {
        return record.Name === 'root' || record.record.id === 'root';
    },

    // A default project exists as the source of truth for Iterations and Releases
    // If the user has access to this project, use these timeboxes for the timeline
    // If the user doesn't have access, traverse up the project hierarchy and use
    // the top-most project as the timebox source of truth
    async _getDefaultProjectID() {
        let defaultProjectID = 167513414724;
        let projectID = this.getContext().getProject().ObjectID;
        let project;

        // Try to fetch default project
        let store = Ext.create('Rally.data.wsapi.Store', {
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
        project = await this.wrapPromise(store.load());

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
                project = await this.wrapPromise(store.load());

                if (project && project.length && project[0].get('Parent')) {
                    projectID = project[0].get('Parent').ObjectID;
                }
            }
            while (project && project.length && project[0].get('Parent'));
        }

        this.defaultProjectID = projectID;

        return projectID;
    },

    async _getReleases() {
        return new Promise(async (resolve, reject) => {
            try {
                this.releases = await this._getTimebox('Release', ['Name', 'ReleaseStartDate', 'ReleaseDate']);
            } catch (e) {
                this.releases = [];
                // this._showError(e, 'Error while fetching releases');
                reject(e);
                return;
            }
            resolve();
        });
    },

    async _getIterations() {
        return new Promise(async (resolve, reject) => {
            try {
                this.iterations = await this._getTimebox('Iteration', ['Name', 'StartDate', 'EndDate']);
            } catch (e) {
                this.iterations = [];
                reject(e);
            }
            resolve();
        });
    },

    async _getMilestones() {
        return new Promise(async (resolve, reject) => {
            try {
                let filter = [{
                    property: 'Projects',
                    operator: 'contains',
                    value: this.getContext().getProjectRef()
                }];
                this.milestones = await this._getTimebox('Milestone', ['Name', 'FormattedID', 'TargetDate'], filter);
            } catch (e) {
                this.milestones = [];
                reject(e);
            }
            resolve();
        });
    },

    async _getTimebox(modelName, fetchItems, filter) {
        let projectID = this.defaultProjectID || await this._getDefaultProjectID();
        let storeFilter = filter || [{
            property: 'Project.ObjectID',
            operator: '=',
            value: projectID
        }];

        return new Promise((resolve, reject) => {
            Ext.create('Rally.data.wsapi.Store', {
                model: modelName,
                autoLoad: true,
                limit: Infinity,
                pageSize: 1000,
                fetch: fetchItems,
                filters: storeFilter,
                context: {
                    project: null,
                    projectScopeDown: false,
                    projectScopeUp: false
                },
                listeners: {
                    load: (store, records, success) => {
                        if (success) {
                            resolve(records);
                        }
                        else { reject(new Error()); }
                    }
                }
            });
        });
    },

    _createNodes(data) {
        let nodes = _.map(data, r => {
            if (r.id && r.id === 'root') {
                return { 'Name': r.id, 'record': r, 'dependencies': [] };
            }
            let record = { 'Name': r.get('FormattedID'), 'record': r.getData(), 'dependencies': [] };
            record.record.getSuccessors = () => {
                return r.getCollection('Successors', { fetch: this.STORE_FETCH_FIELD_LIST.join(',') }).load();
            }
            return record;
        });

        if (this._nodes.length > 1) {
            this.setLoading(`Loading portfolio items... (${this._nodes.length - 1} fetched so far)`);
        }

        return nodes;
    },

    _clearNodes() {
        if (this._nodes) {
            this._removeCards();
            this._nodes = [];
        }
    },

    _findNode(nodes, recordData) {
        let returnNode = null;
        _.each(nodes, node => {
            if (node.record && (node.record._ref === recordData._ref)) {
                returnNode = node;
            }
        });
        return returnNode;
    },

    _findNodeById(nodes, id) {
        return _.find(nodes, node => {
            return node.record._ref === id;
        });
    },

    _findParentNode(nodes, child) {
        if (child.record.ObjectID === 'root') { return null; }
        let parent = child.record.Parent;
        let pParent = null;
        if (parent) {
            //Check if parent already in the node list. If so, make this one a child of that one
            //Will return a parent, or null if not found
            pParent = this._findNode(nodes, parent);
        }
        else {
            //Here, there is no parent set, so attach to the 'null' parent.
            let pt = this._getParentType(this._findTypeByPath(child.record._type));
            //If we are at the top, we will allow d3 to make a root node by returning null
            //If we have a parent type, we will try to return the null parent for this type.
            if (pt) {
                let parentName = '/' + pt.get('TypePath') + '/null';
                pParent = this._findNodeById(nodes, parentName);
            }
        }
        //If the record is a type at the top level, then we must return something to indicate 'root'
        return pParent ? pParent : this._findNodeById(nodes, 'root');
    },

    async _fetchRecordById(type, id) {
        // let deferred = Ext.create('Deft.Deferred');
        let store = Ext.create('Rally.data.wsapi.Store', {
            model: type,
            autoLoad: false,
            pageSize: 1,
            fetch: this.STORE_FETCH_FIELD_LIST,
            filters: [{
                property: 'ObjectID',
                value: id
            }],
            context: { project: null },
        });

        let records = await this.wrapPromise(store.load());

        return records && records.length ? records[0] : null;
    },

    /*    Routines to manipulate the types    */

    _findTypeByOrdinal(ord) {
        return _.find(this._typeStore, type => { return type.get('Ordinal') === ord; });
    },

    _findTypeByPath(path) {
        return _.find(this._typeStore, type => { return type.get('TypePath').toLowerCase() === path.toLowerCase(); });
    },

    _piTypeHasFilters(type) {
        _.each(this.advFilters, (val, key) => {
            if (type.toLowerCase() === key.toLowerCase()) {
                return !!val.length;
            }
        });
    },

    _getParentType(type) {
        let parentType = null;
        let parentOrd = type.get('Ordinal') + 1;
        _.each(this._typeStore, currentType => {
            if (currentType.get('Ordinal') === parentOrd) {
                parentType = currentType;
            }
        });
        return parentType;
    },

    _findChildType(record) {
        let ord = null;
        for (let i = 0; i < this._typeStore.length; i++) {
            if (record.get('_type').toLowerCase() === this._typeStore[i].get('TypePath').toLowerCase()) {
                ord = this._typeStore[i].get('Ordinal');
                ord--;
                break;
            }
        }
        if (ord === null || ord < 0) {
            return null;
        }
        let typeRecord = this._findTypeByOrdinal(ord);
        return typeRecord;
    },

    _getTopLevelTypeOrdinal() {
        let type = this._getTopLevelType();
        return type ? type.get('Ordinal') : 0;
    },

    _getTopLevelTypePath() {
        return this.down('#piTypeCombobox').getValue();
    },

    _getTopLevelType() {
        let typePath = this._getTopLevelTypePath();
        let type = _.find(this._typeStore, thisType => { return thisType.get('TypePath') === typePath; });
        return type;
    },

    _getScopeAllProjects() {
        return this.ancestorFilterPlugin._ignoreProjectScope();
    },

    _isAncestorSelected() {
        return !!this.ancestorFilterPlugin._getValue().pi;
    },

    _getAncestorTypeOrdinal() {
        return this._getOrdFromTypePath(this.ancestorFilterPlugin._getValue().piTypePath);
    },

    _getTypeList(highestOrdinal) {
        let piModels = [];
        _.each(this._typeStore, type => {
            //Only push types below that selected
            if (type.get('Ordinal') <= (highestOrdinal ? highestOrdinal : 0)) {
                piModels.push({ 'Type': type.get('TypePath').toLowerCase(), 'Name': type.get('Name'), 'Ref': type.get('_ref'), 'Ordinal': type.get('Ordinal') });
            }
        });
        return piModels;
    },

    _highestOrdinal() {
        return _.max(this._typeStore, type => { return type.get('Ordinal'); }).get('Ordinal');
    },

    _getLowestFilteredOrdinal() {
        let lowestOrd = this._highestOrdinal() + 1;
        if (this.advFilters) {
            _.each(this.advFilters, (filter, key) => {
                if (filter.length) {
                    let ord = this._getOrdFromTypePath(key);
                    if (ord !== null && ord < lowestOrd) {
                        lowestOrd = ord;
                    }
                }
            });
        }

        return lowestOrd;
    },

    _getHighestFilteredOrdinal() {
        let highestOrdinal = -1;
        if (this.advFilters) {
            _.each(this.advFilters, (filter, key) => {
                if (filter.length) {
                    let ord = this._getOrdFromTypePath(key);
                    if (ord !== null && ord > highestOrdinal) {
                        highestOrdinal = ord;
                    }
                }
            });
        }

        return highestOrdinal;
    },

    _getTypeFromOrd(ord) {
        let type = null;
        _.each(this._typeStore, currentType => { if (ord === currentType.get('Ordinal')) { type = currentType; } });
        return type;
    },

    _getOrdFromTypePath(typePath) {
        let ord = null;
        _.each(this._typeStore, type => {
            if (typePath.toLowerCase() === type.get('TypePath').toLowerCase()) {
                ord = type.get('Ordinal');
            }
        });
        return ord;
    },

    _shouldShowRoot() {
        return this._isAncestorSelected();
    },

    _showReleaseHeader() {
        return this.down('#releasesCheckbox').getValue();
    },

    _showIterationHeader() {
        return this.down('#iterationsCheckbox').getValue();
    },

    _getNodeTreeId(d) {
        return d.id;
    },

    _getNodeTreeRecordId(record) {
        return record._ref;
    },

    _stratifyNodeTree(nodes) {
        return d3.stratify()
            .id(d => {
                let retval = (d.record && this._getNodeTreeRecordId(d.record)) || null;
                return retval;
            })
            .parentId(d => {
                let pParent = this._findParentNode(nodes, d);
                return (pParent && pParent.record && this._getNodeTreeRecordId(pParent.record));
            })
            (nodes);
    },

    _createNodeTree() {
        try {
            this._nodeTree = this._stratifyNodeTree(this._nodes).sum(() => { return 1; });
            return this._repartitionNodeTree();
        }
        catch (e) {
            this._showError(e);
        }
        return null;
    },

    _repartitionNodeTree() {
        try {
            let partition = d3.partition();
            this._nodeTree.sum(() => { return 1; });
            this._nodeTree = partition(this._nodeTree);
            return this._nodeTree;
        }
        catch (e) {
            this._showError(e);
        }
        return null;
    },

    _findTreeNode(id) {
        let retval = null;
        this._nodeTree.each(d => {
            if (this._getNodeTreeId(d) === id) {
                retval = d;
            }
        });
        return retval;
    },

    _initializeSVG() {
        let svg = d3.select('#rootSurface');
        svg.append("g")
            .attr("transform", "translate(" + this._rowHeight + "," + (this._rowHeight + (this._showReleaseHeader() ? this._rowHeight / 1.5 : 0) + (this._showIterationHeader() ? this._rowHeight / 1.5 : 0)) + ")")
            .attr("id", "zoomTree")
            .attr('width', +svg.attr('width') - this._rowHeight)
            .attr('height', +svg.attr('height'))
            .append('rect')
            .attr('width', +svg.attr('width') - this._rowHeight)
            .attr('height', +svg.attr('height'))
            .attr('class', 'arrowbox')
            .on('click', () => {
                if (this.viewportDays !== this.tlBack + this.tlAfter) {
                    this._initialiseScale();
                }
            });
    },

    _removeSVGTree() {
        if (d3.select("#zoomTree")) {
            d3.select("#zoomTree").remove();
        }
        if (this.gX) { this.gX.remove(); }

        this._removeCards();
    },

    _getPiHealthColor(record) {
        let type = this.down('#doneByEstimateCheckbox').getValue() ? 'PercentDoneByStoryPlanEstimate' : 'PercentDoneByStoryCount';
        let health = Rally.util.HealthColorCalculator.calculateHealthColorForPortfolioItemData(record, type);
        return health.hex;
    },

    _removeCards() {
        _.each(this._nodes, node => {
            if (node.card) {
                node.card.destroy();
                node.card = null;
            }
        });
    },

    _exportTimeline() {
        if (!this._nodes || !this._nodes.length) { return; }

        let columns = [
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
        let exportTree = this._createNodeTree();
        let csvArray = [];

        let formatUtils = {
            delimiter: ",",
            rowDelimiter: "\r\n",
            re: new RegExp(',|\"|\r|\n', 'g'),
            reHTML: new RegExp('<\/?[^>]+>', 'g'),
            reNbsp: new RegExp('&nbsp;', 'ig')
        };

        let columnHeaders = _.pluck(columns, 'headerText');
        let dataKeys = _.pluck(columns, 'dataIndex');

        csvArray.push(columnHeaders.join(formatUtils.delimiter));
        this._addLevelToExport(exportTree, csvArray, dataKeys, formatUtils);

        let csvExportString = csvArray.join(formatUtils.rowDelimiter);
        this._downloadCSV(csvExportString);
    },

    _downloadCSV(csv) {
        let filename, link;
        if (csv === null) { return; }
        filename = 'timeline_export.csv';
        link = document.createElement('a');
        document.body.appendChild(link);
        link.style = 'display: none';
        let blob = new Blob([csv], { type: 'text/csv' });
        let url = window.URL.createObjectURL(blob);
        link.href = url;
        link.download = filename;
        link.click();
    },

    _addLevelToExport(exportTree, csvArray, dataKeys, formatUtils) {
        if (exportTree.data && exportTree.data.record && exportTree.data.record.ObjectID !== 'root') {
            let nodeData = [];
            _.each(dataKeys, key => {
                let val = exportTree.data.record[key];
                if (!val) { val = ''; }
                else {
                    val = ((key, val) => {
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
            _.each(exportTree.children, child => {
                this._addLevelToExport(child, csvArray, dataKeys, formatUtils);
            });
        }
    },

    _showError(msg, defaultMessage) {
        console.error(msg);
        this.setLoading(false);
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
        if (e.exception && e.error && typeof e.error.statusText === 'string' && !e.error.statusText.length && e.error.status && e.error.status === 524) {
            return 'The server request has timed out';
        }
        return defaultMessage;
    },

    baseSlice: function (array, start, end) {
        let index = -1,
            length = array.length;

        if (start < 0) {
            start = -start > length ? 0 : (length + start);
        }
        end = end > length ? length : end;
        if (end < 0) {
            end += length;
        }
        length = start > end ? 0 : ((end - start) >>> 0);
        start >>>= 0;

        let result = Array(length);
        while (++index < length) {
            result[index] = array[index + start];
        }
        return result;
    },

    chunk: function (array, size) {
        let length = array == null ? 0 : array.length;
        if (!length || size < 1) {
            return [];
        }
        let index = 0,
            resIndex = 0,
            result = Array(Math.ceil(length / size));

        while (index < length) {
            result[resIndex++] = this.baseSlice(array, index, (index += size));
        }
        return result;
    },

    async wrapPromise(deferred) {
        if (!deferred || !_.isFunction(deferred.then)) {
            return Promise.reject(new Error('Wrap cannot process this type of data into a ECMA promise'));
        }
        return new Promise((resolve, reject) => {
            deferred.then({
                success(...args) {
                    resolve(...args);
                },
                failure(error) {
                    Rally.getApp().setLoading(false);
                    reject(error);
                },
                scope: this
            });
        });
    },

    getCurrentView() {
        let ancestorPlugin = this.ancestorFilterPlugin;
        let ancestorData = {};
        if (ancestorPlugin && !(ancestorPlugin._isSubscriber())) {
            ancestorData = ancestorPlugin.getCurrentView();
        }
        delete ancestorData.piRecord;

        return {
            piTypeCombobox: this._getTopLevelTypePath(),
            axisStartDate: this.down('#axisStartDate').getValue(),
            axisEndDate: this.down('#axisEndDate').getValue(),
            axisLabels: {
                dates: this.down('#dateAxisCheckbox').getValue(),
                iterations: this._showIterationHeader(),
                releases: this._showReleaseHeader()
            },
            gridlines: {
                dates: this.down('#dateGridlineCheckbox').getValue(),
                iterations: this.down('#iterationGridlineCheckbox').getValue(),
                releases: this.down('#releaseGridlineCheckbox').getValue(),
                milestones: this.down('#milestoneGridlineCheckbox').getValue(),
                dependencies: this.down('#showDependenciesCheckbox').getValue(),
                today: this.down('#todayGridlineCheckbox').getValue()
            },
            rowLabels: this._getSelectedRowLabelId(),
            percentDone: this.down('#doneByEstimateCheckbox').checked ? 'doneByEstimateCheckbox' : 'doneByCountCheckbox',
            filters: this.ancestorFilterPlugin.getMultiLevelFilterStates(),
            ancestor: ancestorData
        };
    },

    async setCurrentView(view) {
        this.setLoading('Loading View...');
        Ext.suspendLayouts();
        // Using 2 variables to:
        // - Track the upate of the timeline after setting view
        // - Stop the clearing of the view combobox when chart controls are updated
        // A sleeker way to accomplish this is out there, but time is short
        this.settingView = true;
        this.preventViewReset = true;
        this.down('#piTypeCombobox').setValue(view.piTypeCombobox);
        this.down('#axisStartDate').setValue(new Date(view.axisStartDate));
        this.down('#axisEndDate').setValue(new Date(view.axisEndDate));
        this.down('#dateAxisCheckbox').setValue(view.axisLabels.dates);
        this.down('#iterationsCheckbox').setValue(view.axisLabels.iterations);
        this.down('#releasesCheckbox').setValue(view.axisLabels.releases);
        this.down('#dateGridlineCheckbox').setValue(view.gridlines.dates);
        this.down('#iterationGridlineCheckbox').setValue(view.gridlines.iterations);
        this.down('#releaseGridlineCheckbox').setValue(view.gridlines.releases);
        this.down('#milestoneGridlineCheckbox').setValue(view.gridlines.milestones);
        this.down('#showDependenciesCheckbox').setValue(view.gridlines.dependencies);
        this.down('#todayGridlineCheckbox').setValue(view.gridlines.today);
        this._setSelectedRowLabelId(view.rowLabels);
        this.down(`#${view.percentDone}`).setValue(true);

        if (this.ancestorFilterPlugin) {
            await this.ancestorFilterPlugin.setCurrentView(view.ancestor);
        }

        setTimeout(async () => {
            this.down('#applyFiltersBtn').setDisabled(true);
            Ext.resumeLayouts(true);
            this.settingView = false;
            this.loadingTimeline = false;
            this.advFilters = this.ancestorFilterPlugin.getMultiLevelFilters();
            this._updateFilterTabText();
            await this._refreshTimeline();
            this._setAxisDateFields(new Date(view.axisStartDate), new Date(view.axisEndDate));
            this.preventViewReset = false;
        }, 2000);
    },

    _getSelectedRowLabelId() {
        let radioId = 'showLabelsCheckbox';
        _.each(this.down('#piLabelGroup').items.items, labelRadio => {
            if (labelRadio.getValue()) {
                radioId = labelRadio.itemId;
            }
        });

        return radioId;
    },

    _setSelectedRowLabelId(id) {
        _.each(this.down('#piLabelGroup').items.items, labelRadio => {
            labelRadio.setValue(false);
        });

        this.down(`#${id}`).setValue(true);
    },

    initComponent() {
        this.callParent(arguments);
    }
});