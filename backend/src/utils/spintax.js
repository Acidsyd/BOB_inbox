/**
 * Spintax Parser - Converts {option1|option2|option3} to random selections
 * 
 * Examples:
 * "{Hello|Hi|Hey} {{firstName}}" → "Hi Marco" 
 * "I {noticed|saw|found} your {profile|background}" → "I noticed your profile"
 */

class SpintaxParser {
  
  /**
   * Process spintax in text by replacing {option1|option2|option3} with random selection
   * @param {string} text - Text containing spintax syntax
   * @returns {string} - Text with spintax resolved to random selections
   */
  static spin(text) {
    if (!text || typeof text !== 'string') return '';
    
    // Regex to find spintax patterns: {option1|option2|option3}
    const spintaxRegex = /\{([^{}]+)\}/g;
    
    return text.replace(spintaxRegex, (match, options) => {
      // Split options by pipe character
      const optionsList = options.split('|').map(option => option.trim());
      
      // Return random option
      return this.getRandomOption(optionsList);
    });
  }
  
  /**
   * Get random option from array
   * @param {Array} options - Array of text options
   * @returns {string} - Randomly selected option
   */
  static getRandomOption(options) {
    if (!options || options.length === 0) return '';
    
    const randomIndex = Math.floor(Math.random() * options.length);
    return options[randomIndex];
  }
  
  /**
   * Process spintax with seeded randomization for consistent results
   * @param {string} text - Text with spintax
   * @param {string} seed - Seed for consistent randomization (e.g., lead email)
   * @returns {string} - Processed text
   */
  static spinWithSeed(text, seed = '') {
    if (!text || typeof text !== 'string') return '';
    
    // Simple seed-based randomization
    let seedValue = this.hashSeed(seed);
    
    const spintaxRegex = /\{([^{}]+)\}/g;
    
    return text.replace(spintaxRegex, (match, options) => {
      const optionsList = options.split('|').map(option => option.trim());
      
      // Use seed to get consistent random selection
      seedValue = (seedValue * 9301 + 49297) % 233280;
      const randomIndex = Math.floor((seedValue / 233280) * optionsList.length);
      
      return optionsList[randomIndex];
    });
  }
  
  /**
   * Convert string to numeric hash for seeding
   * @param {string} str - String to hash
   * @returns {number} - Hash value
   */
  static hashSeed(str) {
    let hash = 0;
    if (!str) return hash;
    
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    return Math.abs(hash);
  }
  
  /**
   * Validate if text contains valid spintax syntax
   * @param {string} text - Text to validate
   * @returns {Object} - Validation result
   */
  static validate(text) {
    if (!text) return { valid: true, errors: [] };
    
    const errors = [];
    const spintaxRegex = /\{([^{}]*)\}/g;
    let match;
    
    while ((match = spintaxRegex.exec(text)) !== null) {
      const content = match[1];
      
      if (!content) {
        errors.push(`Empty spintax found: ${match[0]}`);
        continue;
      }
      
      const options = content.split('|');
      
      if (options.length < 2) {
        errors.push(`Spintax must have at least 2 options: ${match[0]}`);
      }
      
      if (options.some(opt => !opt.trim())) {
        errors.push(`Empty option in spintax: ${match[0]}`);
      }
    }
    
    // Check for unmatched brackets
    const openBrackets = (text.match(/\{/g) || []).length;
    const closeBrackets = (text.match(/\}/g) || []).length;
    
    if (openBrackets !== closeBrackets) {
      errors.push('Unmatched spintax brackets');
    }
    
    return {
      valid: errors.length === 0,
      errors: errors
    };
  }
  
  /**
   * Get all possible combinations from spintax (for testing/preview)
   * Warning: Can generate very large arrays for complex spintax
   * @param {string} text - Text with spintax
   * @param {number} maxCombinations - Limit combinations (default: 100)
   * @returns {Array} - Array of all possible combinations
   */
  static getAllCombinations(text, maxCombinations = 100) {
    if (!text) return [text];
    
    const spintaxRegex = /\{([^{}]+)\}/;
    const match = text.match(spintaxRegex);
    
    if (!match) return [text];
    
    const options = match[1].split('|').map(opt => opt.trim());
    const combinations = [];
    
    for (const option of options) {
      const newText = text.replace(match[0], option);
      const subCombinations = this.getAllCombinations(newText, maxCombinations);
      
      combinations.push(...subCombinations);
      
      if (combinations.length >= maxCombinations) break;
    }
    
    return combinations.slice(0, maxCombinations);
  }
}

module.exports = SpintaxParser;