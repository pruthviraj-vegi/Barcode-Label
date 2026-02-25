/**
 * Standalone utility class for parsing CSV strings into structured JSON data.
 * It also immediately applies formatting from the ValueFormatter registry
 * based on the provided variables mapping.
 */
class CSVParser {
    /**
     * Parses a raw CSV string.
     * 
     * @param {string} text - The raw CSV string from the uploaded file
     * @param {Array} variables - Array of variable metadata objects (from ElementManager)
     * @returns {Object} Result object containing { success, data, headers, error }
     */
    static parse(text, variables = []) {
        if (!text || !text.trim()) {
            return { success: false, error: "The uploaded CSV is empty." };
        }

        // Extremely basic CSV parsing (splits by newlines, then commas). 
        // Note: This does not handle commas inside double quotes.
        const lines = text.split(/\r?\n/).filter(line => line.trim() !== '');

        if (lines.length < 2) {
            return { success: false, error: "The CSV must contain a header row and at least one data row." };
        }

        const headers = lines[0].split(',').map(h => h.trim());
        const data = [];

        for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(',');
            const rowObj = {};

            headers.forEach((header, index) => {
                let val = values[index] ? values[index].trim() : '';

                // If this header maps to a variable, apply its formatter immediately
                const matchingVar = variables.find(v => v.name === header);
                if (matchingVar) {
                    val = ValueFormatter.apply(matchingVar.formatter, val);
                }

                rowObj[header] = val;
            });
            data.push(rowObj);
        }

        return {
            success: true,
            headers: headers,
            data: data
        };
    }

    /**
     * Generates a sample CSV string based on currently defined variables.
     * 
     * @param {Array} variables - Array of variable metadata objects
     * @returns {string|null} The generated CSV string or null if no variables exist
     */
    static generateSample(variables) {
        if (!variables || variables.length === 0) {
            return null;
        }

        const headers = ["copies", ...variables.map(v => v.name)].join(',');
        const sampleRow = ["1", ...variables.map(v => "SampleData")].join(',');
        return headers + "\n" + sampleRow;
    }
}
