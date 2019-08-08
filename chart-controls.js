Ext.define('CustomAgile.PortfolioItemTimeline.ChartControls', {
    extend: 'Ext.container.Container',
    alias: 'widget.chartControls',
    itemId: 'timelineChartControlsContainer',
    items: [],
    layout: {
        type: 'hbox',
        align: 'middle',
        defaultMargins: '8 15 5 0'
    },

    constructor(config) {
        this.mergeConfig(config);
        this.cmp = config.cmp;
        this.fontStyle = 'font-size: 13px; font-family:ProximaNova,Helvetica,Arial';
        this.items = [
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
                        labelStyle: this.fontStyle + '; margin-right: 0;',
                        labelWidth: 40,
                        margin: 5,
                        validateOnChange: true,
                        listeners: { aftervalidate: this.cmp._onAxisDateChange }
                    },
                    {
                        xtype: 'rallydatefield',
                        fieldLabel: 'End',
                        labelSeparator: '',
                        value: new Date(),
                        itemId: 'axisEndDate',
                        labelStyle: this.fontStyle + '; margin-right: 0;',
                        labelWidth: 40,
                        margin: 5,
                        validateOnChange: true,
                        listeners: { aftervalidate: this.cmp._onAxisDateChange }
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
                        style: this.fontStyle,
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
                        handler: function () { this.cmp._zoom(false); }.bind(this)
                    },
                    {
                        xtype: 'rallybutton',
                        itemId: 'zoomInBtn',
                        id: 'zoomInBtn',
                        iconCls: 'icon-expand',
                        margin: 0,
                        handler: function () { this.cmp._zoom(true); }.bind(this)
                    }
                ]
            },
            {
                xtype: 'rallybutton',
                text: 'RESET AXIS',
                style: this.fontStyle,
                margin: 0,
                itemId: 'resetViewBtn',
                handler: this.cmp._resetAxis
            },
            {
                xtype: 'panel',
                title: 'AXIS LABELS',
                titleAlign: 'center',
                titleCollapse: true,
                collapsible: true,
                collapsed: true,
                border: false,
                width: 115,
                layout: {
                    type: 'hbox'
                },
                items: [
                    {
                        xtype: 'fieldcontainer',
                        layout: {
                            type: 'vbox'
                        },
                        labelStyle: this.fontStyle,
                        labelSeparator: '',
                        labelWidth: 0,
                        width: 95,
                        margin: 5,
                        defaultType: 'checkboxfield',
                        border: 0,
                        items: [
                            {
                                boxLabel: 'Dates',
                                itemId: 'dateAxisCheckbox',
                                name: 'overlayCheckboxes',
                                inputValue: true,
                                checked: this.cmp.getSetting('calendarOverlay'),
                                handler: this.cmp._setAxis
                            },
                            {
                                boxLabel: 'Iterations',
                                itemId: 'iterationsCheckbox',
                                name: 'overlayCheckboxes',
                                inputValue: true,
                                checked: this.cmp.getSetting('iterationOverlay'),
                                handler: this.cmp._redrawTree
                            },
                            {
                                boxLabel: 'Releases',
                                itemId: 'releasesCheckbox',
                                name: 'overlayCheckboxes',
                                inputValue: true,
                                checked: this.cmp.getSetting('releaseOverlay'),
                                handler: this.cmp._redrawTree
                            }
                        ]
                    }
                ]
            },
            {
                xtype: 'panel',
                title: 'GRIDLINES',
                titleAlign: 'center',
                titleCollapse: true,
                collapsible: true,
                collapsed: true,
                border: false,
                width: 200,
                layout: {
                    type: 'hbox'
                },
                items: [
                    {
                        xtype: 'fieldcontainer',
                        layout: {
                            type: 'vbox'
                        },
                        labelStyle: this.fontStyle,
                        labelSeparator: '',
                        labelWidth: 0,
                        width: 95,
                        margin: 5,
                        defaultType: 'checkboxfield',
                        border: 0,
                        items: [
                            {
                                boxLabel: 'Dates',
                                itemId: 'dateGridlineCheckbox',
                                name: 'gridlineCheckboxes',
                                inputValue: true,
                                checked: this.cmp.getSetting('calendarGridlines'),
                                handler: this.cmp._setAxis
                            },
                            {
                                boxLabel: 'Iterations',
                                itemId: 'iterationGridlineCheckbox',
                                name: 'gridlineCheckboxes',
                                inputValue: true,
                                checked: this.cmp.getSetting('iterationGridlines'),
                                handler: this.cmp._setAxis
                            },
                            {
                                boxLabel: 'Releases',
                                itemId: 'releaseGridlineCheckbox',
                                name: 'gridlineCheckboxes',
                                inputValue: true,
                                checked: this.cmp.getSetting('releaseGridlines'),
                                handler: this.cmp._setAxis
                            }
                        ]
                    },
                    {
                        xtype: 'fieldcontainer',
                        fieldLabel: '',
                        layout: {
                            type: 'vbox'
                        },
                        labelStyle: this.fontStyle,
                        labelSeparator: '',
                        labelWidth: 0,
                        width: 90,
                        margin: 5,
                        defaultType: 'checkboxfield',
                        border: 0,
                        items: [
                            {
                                boxLabel: 'Milestones',
                                itemId: 'milestoneGridlineCheckbox',
                                name: 'gridlineCheckboxes',
                                inputValue: true,
                                checked: this.cmp.getSetting('milestoneGridlines'),
                                handler: this.cmp._setAxis
                            },
                            {
                                boxLabel: 'Dependencies',
                                itemId: 'showDependenciesCheckbox',
                                name: 'gridlineCheckboxes',
                                inputValue: true,
                                checked: this.cmp.getSetting('dependencyStrings'),
                                handler: this.cmp._setAxis
                            },
                            {
                                boxLabel: 'Today',
                                itemId: 'todayGridlineCheckbox',
                                name: 'gridlineCheckboxes',
                                inputValue: true,
                                checked: this.cmp.getSetting('todayGridline'),
                                handler: this.cmp._setAxis
                            }
                        ]
                    }
                ]
            },
            {
                xtype: 'panel',
                title: 'ROW LABELS',
                titleAlign: 'center',
                titleCollapse: true,
                collapsible: true,
                collapsed: true,
                border: false,
                width: 120,
                items: [{
                    xtype: 'fieldcontainer',
                    itemId: 'piLabelGroup',
                    layout: {
                        type: 'vbox'
                    },
                    labelStyle: this.fontStyle,
                    labelSeparator: '',
                    labelWidth: 0,
                    width: 110,
                    margin: 5,
                    defaultType: 'radiofield',
                    border: 0,
                    items: [
                        {
                            boxLabel: 'ID + Name',
                            itemId: 'showLabelsCheckbox',
                            name: 'piLabelField',
                            inputValue: true,
                            checked: true,
                            handler: this.cmp._onRowLabelChange
                        },
                        {
                            boxLabel: 'ID + Short Name',
                            itemId: 'shortenLabelsCheckbox',
                            name: 'piLabelField',
                            inputValue: true,
                            checked: false,
                            handler: this.cmp._onRowLabelChange
                        },
                        {
                            boxLabel: 'ID only',
                            itemId: 'idOnlyCheckbox',
                            name: 'piLabelField',
                            inputValue: true,
                            checked: false,
                            handler: this.cmp._onRowLabelChange
                        }
                    ]
                }]
            },
            {
                xtype: 'panel',
                title: '% DONE',
                titleAlign: 'center',
                titleCollapse: true,
                collapsible: true,
                collapsed: true,
                border: false,
                width: 120,
                items: [{
                    xtype: 'fieldcontainer',
                    itemId: 'percentDoneGroup',
                    layout: {
                        type: 'vbox'
                    },
                    labelStyle: this.fontStyle,
                    labelSeparator: '',
                    labelWidth: 0,
                    width: 110,
                    margin: 5,
                    defaultType: 'radiofield',
                    border: 0,
                    items: [
                        {
                            boxLabel: 'By Plan Est.',
                            itemId: 'doneByEstimateCheckbox',
                            name: 'percentDoneField',
                            inputValue: true,
                            checked: true,
                            handler: this.cmp._redrawTree
                        },
                        {
                            boxLabel: 'By Story Count',
                            itemId: 'doneByCountCheckbox',
                            name: 'percentDoneField',
                            inputValue: true,
                            checked: false
                        },
                    ]
                }]
            },
            {
                xtype: 'text',
                text: 'EXPORT',
                style: this.fontStyle,
                width: 50,
                margin: 0,
                itemId: 'exportLabel'
            },
            {
                xtype: 'rallybutton',
                iconCls: 'icon-export',
                height: 22,
                toolTipText: 'Export Timeline...',
                handler: this.cmp._exportTimeline
            }
        ];
        this.callParent(arguments);
    },

    initComponent: function () {
        this.callParent();
    }
});
