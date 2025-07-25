//  using PROMISES:-
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch((err) => next(err));
  };
};

// USING try-catch
{
  // const asyncHandler = () => {}
  // const asyncHandler = (func) => {() => {} } OR const asyncHandler = (fn) => () => {}; //  both the forms are same
  // const asyncHandler = (fn) => async () => {};
}

// const asyncHandler = (fn) => async (req, res, next) => {
//   try {
//     await fn(req, res, next);
//   } catch (err) {
//     res.status(err.code || 500).json({
//       success: false,
//       message: err.message,
//     });
//   }
// };

export { asyncHandler };
