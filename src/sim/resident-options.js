// 工位上的玩法各自登记；同一人可以收到多个玩法提供的选项。
export function registerResidentOptions(ctx, id, options) {
  ctx.services.compute.tap('resident.options', (rows, context) => {
    if (context.person.id === id) rows.push(...options(context));
  });
}
