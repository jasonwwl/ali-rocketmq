// async function test(i) {
//   console.log(i);
//   if (i === 0) {
//     throw new Error(i);
//   }
//   return i;
// }

// async function run() {
//   try {
//     const res = await Promise.allSettled([test(0), test(1), test(2)]);
//     console.log('bbb');
//     return res;
//   } catch (e) {
//     console.error('catch', e);
//   }
// }

// run().catch(console.error).then(console.log);
