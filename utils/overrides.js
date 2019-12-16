Ext.override(Ext.form.field.Checkbox, {
    getState: function () {
        return { checked: this.getValue() };
    },
    applyState: function (state) {
        if (typeof state.checked === 'boolean') {
            this.setValue(state.checked);
        }
    }
});