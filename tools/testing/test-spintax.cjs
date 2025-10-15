const SpintaxParser = require('./backend/src/utils/spintax');

const testText = '{Buongiorno|Gentile|Salve|Caro/a} {first_name}, {siamo lieti di invitarLa|é con piacere che La invitiamo} alla {prossima|nuova|seconda} edizione';

console.log('=== SPINTAX TEST ===');
console.log('Original:', testText);
console.log('');
console.log('Processed with spinWithSeed:');
const processed = SpintaxParser.spinWithSeed(testText, 'l.manzaroli@activelogistics.it');
console.log(processed);
console.log('');
console.log('=== VALIDATION ===');
const validation = SpintaxParser.validate(testText);
console.log('Valid:', validation.valid);
console.log('Errors:', validation.errors);

console.log('');
console.log('=== TESTING PERSONALIZATION TOKENS ===');
const textWithVars = '{Buongiorno|Gentile|Salve} {first_name}';
console.log('Text with vars:', textWithVars);
console.log('After spintax:', SpintaxParser.spinWithSeed(textWithVars, 'test@test.com'));

// Test what happens if spintax fails
const personalizedAfterSpintax = SpintaxParser.spinWithSeed(textWithVars, 'test@test.com');
const afterPersonalization = personalizedAfterSpintax.replace('{first_name}', 'Mario');
console.log('After personalization:', afterPersonalization);