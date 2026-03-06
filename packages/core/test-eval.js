const { GuardrailEngine } = require('./dist/index.js');

const engine = new GuardrailEngine({
  guards: ['injection', 'pii', 'secrets', 'toxicity', 'hate-speech', 'leakage'],
  threshold: 0.7
});

async function test() {
  const input = "The eval() function in JavaScript can be dangerous";
  const result = await engine.checkInput(input);
  console.log(JSON.stringify(result, null, 2));
}

test().catch(console.error);
