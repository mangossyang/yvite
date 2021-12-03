const Koa = require("koa");
const fs = require("fs");
const { join } = require("path");
const compilerSfc = require("@vue/compiler-sfc");
const compilerDom = require("@vue/compiler-dom");
const app = new Koa();

app.use(async (ctx) => {
  const { url, query } = ctx.request;
  if (url === "/") {
    ctx.type = "text/html";
    ctx.body = fs.readFileSync(join(__dirname, "./index.html"), "utf-8");
  } else if (url.endsWith(".js")) {
    const p = join(__dirname, url);
    ctx.type = "text/javascript";
    const file = rewriteImport(fs.readFileSync(p, "utf-8"));
    ctx.body = file;
  } else if (url.startsWith("/@modules/")) {
    const moduleName = url.replace("/@modules/", ""); // 获取模块名称
    const prefix = join(__dirname, "node_modules", moduleName);
    const module = require(prefix + "/package.json").module; //找到对应模块package.json中的module
    const filePath = join(prefix, module);
    ctx.type = "text/javascript";
    ctx.body = rewriteImport(fs.readFileSync(filePath, "utf-8"));
  } else if (url.includes(".vue")) {
    // compilerSfc解析sfc 获得ast
    const p = join(__dirname, url.split("?")[0]);
    const ret = compilerSfc.parse(fs.readFileSync(p, "utf-8"));
    //没有query SFC
    if (!query.type) {
      //获取脚本内容
      const scriptContent = ret.descriptor.script.content;
      // 转换默认导出配置为变量
      const script = scriptContent.replace(
        "export default ",
        "const __script = "
      );
      ctx.type = "text/javascript";
      ctx.body = `
             ${rewriteImport(script)}
             //template解析转换为另一个请求
             import {render as __render} from '${url}?type=template'
             __script.render = __render
             export default __script
        `;
    } else if (query.type === "template") {
      const tpl = ret.descriptor.template.content;
      //编译为包含render的模块
      const render = compilerDom.compile(tpl, {
        mode: "module"
      }).code;

      ctx.type = "text/javascript";
      ctx.body = rewriteImport(render);
    }
  }
});
// 重写导入 将路径变成相对地址
function rewriteImport(content) {
  return content.replace(/ from ['"](.*)['"]/g, (s0, s1) => {
    // s0匹配字符串 s1分组内容
    if (s1.startsWith("/") || s1.startsWith("./") || s1.startsWith("../")) {
      return s0;
    } else {
      return ` from '/@modules/${s1}'`;
    }
  });
}
app.listen(9999, () => {
  console.log("--success--");
});
