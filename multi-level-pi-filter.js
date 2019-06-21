Ext.define('Utils.MultiLevelPiAppFilter', {
    alias: 'plugin.UtilsMultiLevelPiAppFilter',
    mixins: ['Ext.AbstractPlugin'],
    extend: 'Ext.Component',

    statics: {
        RENDER_AREA_ID: 'multi-level-pi-app-filter-btn'
    },

    config: {
        /**
         * @cfg {String}
         * The id of the component where the filter button will render itself
         */
        btnRenderAreaId: 'multi-level-pi-app-filter-btn',

        /**
         * @cfg {String}
         * The id of the component where the tabbed filter panel will render itself
         */
        panelRenderAreaId: 'multi-level-pi-app-filter-panel',

        /**
         * @cfg {Object}
         * Config applied to the app settings components
         */
        settingsConfig: {
            labelWidth: 150,
            padding: 10
        },

        /**
         * @cfg {Array}
         * Field list for filter panel
         */
        defaultFields: ['ArtifactSearch', 'Owner'],

        /**
         * @cfg {Boolean}
         * Set to true to hide advanced filters on load
         */
        advancedFilterCollapsed: false,
    },

    portfolioItemTypes: [],

    constructor: function (config) {
        this.callParent(arguments);
    },

    initComponent: function () {
        this.callParent(arguments);
        this.addEvents('ready', 'change');
    },

    init: function (cmp) {
        this.cmp = cmp;

        //this.cmp.on('resize', this._onCmpResize, this);

        // Get the area where filter button will render
        this.btnRenderArea = this.cmp.down('#' + this.btnRenderAreaId);

        // Get the area where tabbed filter panel will render
        this.panelRenderArea = this.cmp.down('#' + this.panelRenderAreaId);

        // Extend app settings fields
        var cmpGetSettingsFields = this.cmp.getSettingsFields;
        this.cmp.getSettingsFields = function () {
            return this._getSettingsFields(cmpGetSettingsFields.apply(cmp, arguments));
        }.bind(this);

        // Extend app default settings fields
        var appDefaults = this.cmp.defaultSettings;
        appDefaults['Utils.MultiLevelPiAppFilter.enableMultiLevelPiFilter'] = true;
        //appDefaults['Utils.MultiLevelPiAppFilter.projectScope'] = 'current';
        this.cmp.setDefaultSettings(appDefaults);

        Ext.override(Rally.ui.inlinefilter.InlineFilterPanel, {
            // We don't want chevrons in the tab panel
            _alignChevron: function () {
                if (this.chevron) { this.chevron.hide(); }
            }
        });

        // Add the control components then fire ready
        this._addFilters().then(
            function () {
                this._setReady();
            }.bind(this),
            function (error) {
                Rally.ui.notify.Notifier.showError({ message: error });
            });
    },

    _setReady: function () {
        this.ready = true;
        this.fireEvent('ready', this);
    },

    _getSettingsFields: function (fields) {
        var pluginSettingsFields = [{
            xtype: 'rallycheckboxfield',
            id: 'Utils.MultiLevelPiAppFilter.enableMultiLevelPiFilter',
            name: 'Utils.MultiLevelPiAppFilter.enableMultiLevelPiFilter',
            fieldLabel: 'Enable multi-level portfolio item filter',
        }];
        pluginSettingsFields = _.map(pluginSettingsFields, function (pluginSettingsField) {
            return _.merge(pluginSettingsField, this.settingsConfig);
        }, this);
        // apply any settings config to each field added by the plugin
        return pluginSettingsFields.concat(fields || []);
    },

    _showMultiLevelFilter: function () {
        return this.cmp.getSetting('Utils.MultiLevelPiAppFilter.enableMultiLevelPiFilter');
    },

    // Requires that app settings are available (e.g. from 'beforelaunch')
    _addFilters: function () {

        //if (this._showMultiLevelFilter()) { TODO
        return new Promise(function (resolve, reject) {
            var promises = [];
            if (this.btnRenderArea) {
                this.btnRenderArea.add(
                    {
                        xtype: 'rallybutton',
                        cls: 'secondary rly-small',
                        iconCls: 'icon-filter',
                        toolTipText: 'Show Filters',
                        handler: this._toggleFilters,
                        scope: this
                    }
                );

                Rally.data.util.PortfolioItemHelper.getPortfolioItemTypes().then({
                    scope: this,
                    success: function (piTypes) {
                        this.piTypes = piTypes.reverse();
                        var piTypePaths = _.map(piTypes, function (piType) {
                            return piType.get('TypePath');
                        });

                        this.models = Rally.data.ModelFactory.getModels({
                            types: piTypePaths,
                            context: this.cmp.getContext(),
                            scope: this,
                            success: function (models) {

                                this.tabPanel = this.panelRenderArea.add({
                                    xtype: 'tabpanel',
                                    width: '98%',
                                    plain: true,
                                    autoRender: true,
                                    items: []
                                });

                                this.filterControls = [];

                                _.each(models, function (model, key) {
                                    promises.push(new Promise(function (newResolve, newReject) {
                                        var filterName = `inlineFilter${key}`;
                                        this.filterControls.push(Ext.create('Rally.ui.inlinefilter.InlineFilterControl', {
                                            xtype: 'rallyinlinefiltercontrol',
                                            name: filterName,
                                            itemId: filterName,
                                            context: this.cmp.getContext(),
                                            inlineFilterButtonConfig: {
                                                stateful: true,
                                                stateId: this.cmp.getContext().getScopedStateId(`multi-${filterName}`),
                                                context: this.cmp.getContext(),
                                                modelNames: key,
                                                inlineFilterPanelConfig: {
                                                    name: `${filterName}-panel`,
                                                    itemId: `${filterName}-panel`,
                                                    model: model,
                                                    padding: 5,
                                                    width: '98%',
                                                    context: this.cmp.getContext(),
                                                    quickFilterPanelConfig: {
                                                        defaultFields: this.defaultFields
                                                    },
                                                    advancedFilterPanelConfig: {
                                                        collapsed: this.advancedFilterCollapsed
                                                    },
                                                },
                                                listeners: {
                                                    inlinefilterchange: this._onFilterChange,
                                                    inlinefilterready: function (panel) {
                                                        this._onFilterReady(panel);
                                                        newResolve();
                                                    },
                                                    scope: this
                                                }
                                            }
                                        }));
                                    }.bind(this)));
                                }, this);

                                Promise.all(promises).then(function () {

                                    this.clearAllButton = Ext.widget({
                                        xtype: 'rallybutton',
                                        itemId: 'clearAllButton',
                                        cls: 'secondary rly-small clear-all-filters-button',
                                        text: 'Clear All',
                                        margin: '3 9 3 -11',
                                        hidden: !this._hasFilters(),
                                        listeners: {
                                            click: this._clearAllFilters,
                                            scope: this
                                        }
                                    });

                                    this.btnRenderArea.add(this.clearAllButton);
                                    this.tabPanel.setActiveTab(0);
                                    this.tabPanel.hide();
                                    //this._applyFilters();

                                    // Without this, the components are clipped on narrow windows
                                    this.btnRenderArea.setOverflowXY('auto', 'auto');

                                    resolve();
                                }.bind(this));
                            },
                            failure: function () {
                                reject('Failed to fetch models for multi-level filter');
                            }
                        });
                    },
                    failure: function () {
                        reject('Failed to fetch portfolio item types for multi-level filter');
                    }
                });
            } else {
                reject('Unable to find button render area for multi-level filter');
            }
        }.bind(this));
    },

    _clearAllFilters: function () {
        this.suspendEvents(false);
        this.suspendLayouts();

        _.each(this.filterControls, function (filterControl) {
            filterControl.inlineFilterButton.clearAllFilters();
        });

        if (this.clearAllButton) {
            this.clearAllButton.hide();
        }

        this.resumeEvents();
        this.resumeLayouts(false);
        this.updateLayout();
        this.fireEvent('change', this.getFilters());
    },

    _hasFilters: function () {
        var filters = this.getFilters();
        var returnVal = false;

        _.each(filters, function (filter) {
            if (filter.length) {
                returnVal = true;
            }
        });

        return returnVal;
    },

    _onFilterReady: function (inlineFilterPanel) {
        let tab = this.tabPanel.add({
            title: inlineFilterPanel.model && inlineFilterPanel.model.elementName,
            html: '',
            itemId: `${inlineFilterPanel.model && inlineFilterPanel.model.elementName}-tab`
        });
        tab.add(inlineFilterPanel);
        inlineFilterPanel.expand();
    },

    _applyFilters() {
        this.suspendEvents(false);
        this.suspendLayouts();
        _.each(this.filterControls, function (filterControl) {
            filterControl.inlineFilterButton._applyFilters();
        });
        this.resumeEvents();
        this.resumeLayouts(false);
        this.updateLayout();
    },

    _onFilterChange: function () {
        if (this.clearAllButton) {
            if (this._hasFilters()) {
                this.clearAllButton.show();
            }
            else {
                this.clearAllButton.hide();
            }
        }

        if (this.ready) {
            this.fireEvent('change', this.getFilters());
        }
    },

    _toggleFilters: function (btn) {
        if (this.tabPanel.isHidden()) {
            this.tabPanel.show();
            btn.addCls('primary');
            btn.removeCls('secondary');
        } else {
            this.tabPanel.hide();
            btn.addCls('secondary');
            btn.removeCls('primary');
        }
    },

    getFilters() {
        var filters = {};

        _.each(this.filterControls, function (filterControl) {
            let typeName = (filterControl.inlineFilterButton.modelNames) || 'unknown';
            filters[typeName] = filterControl.inlineFilterButton.getFilters();
        });

        return filters;
    }
});