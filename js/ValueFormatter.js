/**
 * Registry of value formatters.
 * Easily add new formatters here to have them appear in the Property Panel
 * and automatically apply during the printing process.
 */
const ValueFormatter = {

    /**
     * Define the available formatters.
     * key: the internal ID saved in element metadata
     * name: the human-readable name shown in the UI dropdown
     * format: the function that transforms the raw input string
     */
    registry: [
        {
            key: 'none',
            name: 'None',
            format: (val) => val
        },
        {
            key: 'currency',
            name: 'Currency (1,000)',
            format: (val) => {
                const num = parseFloat(val);
                return isNaN(num) ? val : num.toLocaleString();
            }
        },
        {
            key: 'date-compact',
            name: 'Date Compact (25022026)',
            format: (val) => {
                // expecting YYYY-MM-DD from 'date' input
                if (val && val.includes('-')) {
                    const [y, m, d] = val.split('-');
                    return `${d}${m}${y}`;
                }
                return val;
            }
        },
        {
            key: 'uppercase',
            name: 'UPPERCASE',
            format: (val) => val ? val.toUpperCase() : val
        },
        {
            key: 'lowercase',
            name: 'lowercase',
            format: (val) => val ? val.toLowerCase() : val
        }
    ],

    /**
     * Apply a specific formatter by key to a value.
     */
    apply(key, value) {
        if (!value) return value;
        const formatter = this.registry.find(f => f.key === key);
        if (formatter && formatter.format) {
            return formatter.format(value);
        }
        return value;
    },

    /**
     * Generate HTML <option> tags for the Property Panel select dropdown.
     */
    buildOptionsHtml(selectedKey) {
        const active = selectedKey || 'none';
        return this.registry.map(f =>
            `<option value="${f.key}" ${active === f.key ? 'selected' : ''}>${f.name}</option>`
        ).join('\n');
    }

};
