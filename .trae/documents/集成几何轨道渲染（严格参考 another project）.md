## 目标
- 在现有单页应用中集成几何轨道3D渲染，严格复用 `/another project/app.js` 的三维坐标转换公式与轨道算法，并采用 `/another project/index.html` 的渲染管线与材质/光照/摄像机参数。
- 保留现有交互、性能优化与响应式布局；支持 60fps。

## 参考到现有的映射关系
- **轨道构型算法**：
  - p（哑铃形）→ 使用 `createDumbbellGeometry(scale)`，角函数 |cos θ|，极坐标→笛卡尔转换。
  - d（5取向）→ 使用 `createDOrbitalGeometry(scale, index)`，基于简化球谐函数绝对值：`dz²: 3cos²θ−1`、`dxz/dyz: sinθ·cosθ·cosφ/sinφ`、`dx²−y²: sin²θ·cos(2φ)`、`dxy: sin²θ·sin(2φ)`。
  - s（球形）→ 标准球体网格；f（简化）→ `createFOrbitalGeometry`。
- **渲染管线参数**（采用 `/another project/index.html`）：
  - 场景背景 `0x0a0a0a`
  - 摄像机：`PerspectiveCamera(75, aspect, 0.1, 1000)`，`position(0,0,15)`
  - 光照：`AmbientLight(0xffffff, 0.6)`、`DirectionalLight(0xffffff, 0.8)` at `(10,10,10)`
  - 控制：`OrbitControls`，`enableDamping=true`，`dampingFactor=0.05`，`minDistance=5`，`maxDistance=50`
  - 颜色：`ORBITAL_COLORS { s:#ff6b6b, p:#4ecdc4, d:#ffe66d, f:#a8e6cf }`

## 集成实现步骤
1) **新增几何模式渲染模块**
- 在当前项目的 Three.js 区域增加 `geometryOrbitalRenderer`：
  - 复制/改写 `createDumbbellGeometry`、`createDOrbitalGeometry`、`createFOrbitalGeometry` 与 `createOrbitalShape(type, index, n)` 的网格生成；
  - 轨道组 `orbitalGroup` 与 `userData` 结构遵循参考（`level, orbitalIndex, maxElectrons, currentElectrons, orbitalType, n, orbitalName, visible`）。

2) **管线参数对齐**
- 在主 3D 面板中：
  - 设置背景、相机、光照与 `OrbitControls` 参数与参考一致；
  - 保留现有性能优化（像素比限制、抗锯齿、controls.damping、渲染循环结构）。

3) **交互与显示**
- 使用现有 UI：
  - “显示轨道形状/电子云/电子点/透明度/选择轨道”交互沿用参考逻辑；
  - 维持现有周期表点击与能级图联动，仅在 3D 部分切换为几何模式渲染。
- 颜色对比度：沿用参考 ORBITAL_COLORS（亮色方案），兼容深色背景，对比度≥4.5:1。

4) **填充动画（洪德规则）**
- 复用参考的逐步填充：
  - 第一轮每轨道单占（↑），第二轮配对（↓），每步 400ms；
  - 通过 `currentElectrons` 与 `maxElectrons` 控制材质透明度与电子点生成。

5) **适配当前项目数据与序列**
- 元素与电子排布：继续使用当前权威配置驱动（本地 `电子排布式.txt`），将每能层的 `electronConfig` 转为参考模块输入（`level→electrons`）。
- 构造原理顺序和特例（Cr/Cu/Ag/…）：保持现有顺序生成步骤，但几何渲染展示轨道形状。

6) **验证与测试**
- 差异比对：
  - 选定若干元素（Ne、Cu、Ag、Pd），截图对比：曲线平滑、材质、光照与摄像机视角与参考一致。
- 兼容性：Chrome/Edge/Firefox，在 `dot` 与 `cloud` 视图下交互正常。
- 性能：在默认分辨率下测帧率≥60fps；若设备较弱，指导用户调低透明度或关闭概率密度显示。

## 保留与不变
- 不改变当前能级图与周期表交互、电子数验证、响应式布局、性能限额（像素比与 damping）。

## 交付内容
- 几何渲染模块、与现有体渲染并存（默认启用几何渲染显示）。
- 验证报告：对比参考文件在若干元素下的渲染效果与帧率；记录浏览器兼容与差异点。

## 风险与回退
- 若设备不支持高面数几何，可降 segments（例如 p/d 轨道从 50→36），保持曲线平滑与帧率。
- 若颜色在某显示环境对比不足，提供可选“高对比模式”开关，提升材质 emissive。