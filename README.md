# 原子电子轨道与能级填充演示（Three.js + D3.js）

这个项目在浏览器中可视化原子的电子轨道与能级填充过程：左侧是周期表和说明面板，右侧包含能级图（D3）与三维轨道几何渲染（Three.js）。

## 在线访问

当仓库启用 GitHub Pages 后，访问链接为：

- https://tedmaoxie.github.io/atom_structure_6/

> 提示：需要在仓库的 Settings → Pages 中将 Source 设置为 "Deploy from a branch"，选择 `main` 分支和根目录 `/`，保存后等待 1–2 分钟生效。

## 本地运行

无需任何后端，直接用本地静态服务器打开：

- Python（推荐）：
  - `python -m http.server 8000`
  - 打开浏览器访问 `http://localhost:8000/`

- 也可用其它静态服务器（如 VSCode Live Server、http-server 等）。

## 文件结构

- `index.html`：入口页面（加载样式与 UI 布局）
- `scripts/main.js`：主要逻辑，能级图与 3D 轨道渲染、交互等
- `电子排布式.txt`：电子排布权威数据集，运行时从根目录加载

## 部署到 GitHub Pages（步骤）

1. 将仓库设为 Public（在 GitHub 仓库页 → Settings → General）。
2. 上传代码到 `main` 分支（已由本项目完成）。
3. 打开仓库页 → `Settings` → `Pages`：
   - Source：选择 `Deploy from a branch`
   - Branch：`main`，Folder：`/ (root)`
   - 点击保存
4. 等待 1–2 分钟，页面会显示最终链接；访问 `https://tedmaoxie.github.io/atom_structure_6/` 验证。

## 注意事项

- 本项目依赖 CDN 加载 `three` 与 `d3`，网络受限环境下可能加载较慢。
- 数据文件加载路径在 `scripts/main.js` 中做了容错：优先尝试 `./电子排布式.txt`，能在 GitHub Pages 正常工作。
- 如果你看到空白页或控制台报错，请检查是否启用了 Pages，以及静态资源是否都位于仓库根目录。

## 许可证

未显式声明许可证；如需开源许可证，可根据需要添加（例如 MIT）。