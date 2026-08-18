window.__ModuleLoader__.load({
	id: "dsh-discovery",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react = require("react");
		//#region src/client/locales.ts
		/** zh/en dictionaries for the discovery browser. */
		const zh = {
			nav: "插件搜索",
			subtitle: "浏览 DeepSeek Harness 社区插件（GitHub dsh-plugin 主题）",
			searchPh: "搜索插件，比如：通知、终端、记忆…",
			all: "全部",
			empty: "没有匹配的插件",
			searchingOnline: "插件列表中无匹配，正在 GitHub 全网搜索…",
			searchOnlineResults: "GitHub 在线搜索结果 {n} 条（含 topic 索引尚未收录的最新仓库）",
			loadFail: "插件列表加载失败，请稍后重试",
			viewRepo: "查看仓库",
			openOnGitHub: "在 GitHub 打开",
			stars: "星标",
			fetchedFrom: "数据来自 GitHub dsh-plugin 主题，非官方认证。安装前请自行审查仓库代码，并使用 dsh plugin add 安装。",
			refresh: "刷新",
			loading: "加载中…",
			lang: "语言",
			updated: "更新于",
			total: "共 {n} 个插件",
			disclaimerTitle: "安全提示",
			disclaimerBody: "本页面仅提供浏览与搜索，不包含安装功能。插件均为社区第三方代码，安装前请审查仓库源码，并通过 dsh plugin add 由 DHS 自身完成安装。",
			official: "官方",
			thirdParty: "第三方",
			reviewInstall: "审查安装",
			repoPreview: "仓库预览",
			readmeLoading: "README 加载中…",
			readmeFail: "README 加载失败",
			noReadme: "该仓库没有 README 文件",
			scenariosTab: "场景配置",
			scenariosTitle: "按使用场景推荐插件",
			scenarioMatchCount: "匹配 {n} 个插件",
			installAll: "一键安装",
			customInstall: "自定义安装",
			scenario_writing: "高效写作与内容创作",
			scenario_writing_desc: "记忆、技能、模板、笔记等创作辅助",
			scenario_dev: "开发工具链",
			scenario_dev_desc: "终端、Git、Docker、调试等开发增强",
			scenario_model: "模型与 API 接入",
			scenario_model_desc: "多模型、Provider、网关接入",
			scenario_automation: "自动化工作流",
			scenario_automation_desc: "命令、任务调度、工作流编排",
			scenario_notify: "通知与集成",
			scenario_notify_desc: "Webhook、IM、消息推送集成",
			networkNote: "网络提示：国内访问 GitHub/npm 可能较慢或失败。安装时可用 npm 国内镜像加速——阿里源 registry.npmmirror.com 或清华源 mirrors.tuna.tsinghua.edu.cn。注意：国内源仅加速「安装」（包下载），不提供仓库 README 查看与源码审查能力，后者仍需访问 GitHub（必要时需代理）。",
			category_ui: "UI 增强",
			category_terminal: "终端",
			category_tools: "工具与能力",
			category_memory: "记忆",
			category_model: "模型与接入",
			category_notify: "通知与集成",
			category_dev: "开发与运行时",
			category_other: "其他",
			lastRefresh: "上次刷新",
			installedTooltip: "该插件已安装",
			checkUpdate: "检查更新",
			installedTab: "已安装",
			updateAll: "一键更新",
			updateAllNote: "点击一键更新——DHS 将先安全审查每个新版本（依赖/代码/权限变更），通过后再安装",
			currentVersion: "当前",
			latestVersion: "最新",
			updateAvailable: "有更新",
			upToDate: "已是最新",
			versionUnknown: "版本未知",
			noInstalled: "尚未安装任何插件",
			updateLoading: "正在检查版本…",
			updateFail: "版本检查失败",
			updateEmpty: "全部插件已是最新版本",
			repoLatest: "仓库最新提交",
			baselineReady: "基线已建立",
			fromNpm: "npm",
			fromGithub: "GitHub"
		};
		const en = {
			nav: "Plugin Discovery",
			subtitle: "Browse community plugins for DeepSeek Harness (GitHub dsh-plugin topic)",
			searchPh: "Search plugins: notify, terminal, memory…",
			all: "All",
			empty: "No matching plugins",
			searchingOnline: "No match in the plugin list, searching GitHub…",
			searchOnlineResults: "{n} results from GitHub full-text search (includes fresh repos whose topic index lags)",
			loadFail: "Failed to load plugin list, please retry",
			viewRepo: "View repository",
			openOnGitHub: "Open on GitHub",
			stars: "stars",
			fetchedFrom: "Data from the GitHub dsh-plugin topic, not officially endorsed. Review the repository before installing, and use dsh plugin add.",
			refresh: "Refresh",
			loading: "Loading…",
			lang: "Language",
			updated: "Updated",
			total: "{n} plugins",
			disclaimerTitle: "Security note",
			disclaimerBody: "This page only browses and searches — it cannot install. Plugins are third-party community code; review the source and install via dsh plugin add.",
			official: "Official",
			thirdParty: "Third-party",
			reviewInstall: "Review & install",
			repoPreview: "Repository preview",
			readmeLoading: "Loading README…",
			readmeFail: "Failed to load README",
			noReadme: "This repository has no README",
			scenariosTab: "Scenarios",
			scenariosTitle: "Recommended plugins by scenario",
			scenarioMatchCount: "{n} plugins matched",
			installAll: "Install all",
			customInstall: "Custom install",
			scenario_writing: "Writing & creation",
			scenario_writing_desc: "Memory, skills, templates, notes",
			scenario_dev: "Dev toolchain",
			scenario_dev_desc: "Terminal, Git, Docker, debugging",
			scenario_model: "Models & APIs",
			scenario_model_desc: "Multi-model, providers, gateways",
			scenario_automation: "Automation workflows",
			scenario_automation_desc: "Commands, scheduling, orchestration",
			scenario_notify: "Notifications & integrations",
			scenario_notify_desc: "Webhooks, IM, message push",
			networkNote: "Network note: GitHub/npm may be slow or fail in some regions. For installation you can use npm mirrors — Alibaba registry.npmmirror.com or Tsinghua mirrors.tuna.tsinghua.edu.cn. These mirrors only accelerate package downloads; they cannot preview READMEs or source code, which still require GitHub access.",
			category_ui: "UI Enhancements",
			category_terminal: "Terminal",
			category_tools: "Tools & Skills",
			category_memory: "Memory",
			category_model: "Models & Access",
			category_notify: "Notifications & Integrations",
			category_dev: "Dev & Runtime",
			category_other: "Others",
			lastRefresh: "Last refreshed",
			installedTooltip: "This plugin is installed",
			checkUpdate: "Check updates",
			installedTab: "Installed",
			updateAll: "Update all",
			updateAllNote: "Click to update all — DHS audits each new version (deps/code/permissions) before installing",
			currentVersion: "Current",
			latestVersion: "Latest",
			updateAvailable: "Update available",
			upToDate: "Up to date",
			versionUnknown: "Unknown",
			noInstalled: "No plugins installed yet",
			updateLoading: "Checking versions…",
			updateFail: "Failed to check versions",
			updateEmpty: "All plugins are up to date",
			repoLatest: "Latest commit",
			baselineReady: "Baseline set",
			fromNpm: "npm",
			fromGithub: "GitHub"
		};
		//#endregion
		//#region src/client/market-data.ts
		/** Category buckets derived from the plugin name / topics / description. */
		const CATEGORY_KEYWORDS = [
			{
				id: "ui",
				label: "UI 增强",
				match: /sidebar|ui|theme|skin|panel|overlay|web-ui|interface/i
			},
			{
				id: "terminal",
				label: "终端",
				match: /terminal|tui|shell|cli|console|bash/i
			},
			{
				id: "tools",
				label: "工具与能力",
				match: /tool|skill|command|automation|workflow/i
			},
			{
				id: "memory",
				label: "记忆",
				match: /memory|recall|remember|store|kv|vector/i
			},
			{
				id: "model",
				label: "模型与接入",
				match: /model|provider|llm|api|gateway|inference/i
			},
			{
				id: "notify",
				label: "通知与集成",
				match: /notify|notification|webhook|slack|wechat|feishu|telegram|dingtalk/i
			},
			{
				id: "dev",
				label: "开发与运行时",
				match: /dev|runtime|debug|inspect|code|git|docker|sandbox/i
			}
		];
		/**
		* 中英同义词表：中文搜索词 → 英文关键词数组。插件数据是英文的
		* （name/description/topics），用户搜中文词时用英文关键词去匹配，
		* 避免中文搜索漏掉英文内容。覆盖常见插件技术词，按需扩充。
		*/
		const SEARCH_SYNONYMS = {
			记忆: [
				"memory",
				"recall",
				"remember",
				"store",
				"kv",
				"vector"
			],
			终端: [
				"terminal",
				"tui",
				"console",
				"shell",
				"bash"
			],
			通知: [
				"notify",
				"notification",
				"webhook",
				"slack",
				"wechat",
				"feishu",
				"telegram",
				"dingtalk",
				"push"
			],
			聊天: [
				"chat",
				"conversation",
				"message",
				"dialog",
				"discuss"
			],
			对话: [
				"chat",
				"conversation",
				"message",
				"dialog"
			],
			界面: [
				"ui",
				"interface",
				"panel",
				"overlay",
				"web-ui"
			],
			皮肤: [
				"theme",
				"skin",
				"appearance"
			],
			主题: ["theme", "skin"],
			工具: [
				"tool",
				"utility",
				"command",
				"automation"
			],
			模型: [
				"model",
				"llm",
				"provider",
				"inference",
				"gateway"
			],
			插件: [
				"plugin",
				"extension",
				"addon",
				"module"
			],
			搜索: [
				"search",
				"discovery",
				"find",
				"query"
			],
			开发: [
				"dev",
				"runtime",
				"debug",
				"inspect",
				"code",
				"git",
				"docker",
				"sandbox"
			],
			测试: [
				"test",
				"testing",
				"spec",
				"verify"
			],
			文档: [
				"doc",
				"documentation",
				"docs",
				"wiki"
			],
			数据库: [
				"database",
				"db",
				"sql",
				"kv",
				"storage",
				"postgres",
				"mysql",
				"sqlite"
			],
			缓存: [
				"cache",
				"redis",
				"memcached"
			],
			队列: [
				"queue",
				"mq",
				"kafka",
				"rabbitmq"
			],
			网络: [
				"network",
				"http",
				"request",
				"fetch",
				"socket",
				"websocket",
				"proxy"
			],
			安全: [
				"security",
				"auth",
				"login",
				"password",
				"token",
				"permission",
				"sandbox"
			],
			文件: [
				"file",
				"fs",
				"filesystem",
				"path",
				"folder",
				"directory"
			],
			图片: [
				"image",
				"photo",
				"picture",
				"vision"
			],
			视频: [
				"video",
				"media",
				"stream"
			],
			音频: [
				"audio",
				"sound",
				"voice",
				"speech",
				"tts",
				"asr"
			],
			语音: [
				"voice",
				"speech",
				"tts",
				"asr",
				"audio"
			],
			代码: [
				"code",
				"source",
				"snippet",
				"syntax",
				"highlight"
			],
			工作流: [
				"workflow",
				"pipeline",
				"automation",
				"orchestration"
			],
			调度: [
				"schedule",
				"cron",
				"timer",
				"task",
				"job"
			],
			代理: [
				"proxy",
				"agent",
				"provider"
			],
			分析: [
				"analytics",
				"analysis",
				"metrics",
				"stats",
				"dashboard"
			],
			监控: [
				"monitor",
				"watch",
				"alert",
				"metric",
				"observability"
			],
			日志: [
				"log",
				"logging",
				"trace",
				"logger"
			],
			浏览器: [
				"browser",
				"chromium",
				"playwright",
				"puppeteer",
				"web"
			],
			网页: [
				"web",
				"html",
				"http",
				"page",
				"browser"
			],
			集成: [
				"integration",
				"api",
				"webhook",
				"connect"
			]
		};
		function categoryOf(plugin) {
			const haystack = `${plugin.name} ${plugin.topics.join(" ")} ${plugin.description}`.slice(0, 400);
			for (const cat of CATEGORY_KEYWORDS) if (cat.match.test(haystack)) return cat.id;
			return "other";
		}
		function orderedCategories(listing) {
			const counts = /* @__PURE__ */ new Map();
			for (const plugin of listing?.plugins ?? []) {
				const id = categoryOf(plugin);
				counts.set(id, (counts.get(id) ?? 0) + 1);
			}
			return CATEGORY_KEYWORDS.map((c) => ({
				id: c.id,
				label: c.label,
				count: counts.get(c.id) ?? 0
			})).concat({
				id: "other",
				label: "其他",
				count: counts.get("other") ?? 0
			}).filter((c) => c.count > 0);
		}
		/** Pure filter+sort; the component memoizes with useMemo. */
		function filterPlugins(listing, opts) {
			const all = listing?.plugins ?? [];
			const q = opts.q.trim();
			const qLower = q.toLowerCase();
			const labelCat = q === "" ? void 0 : CATEGORY_KEYWORDS.find((c) => c.label === q);
			const synonyms = q === "" ? void 0 : SEARCH_SYNONYMS[q];
			return all.filter((p) => {
				if (opts.cat !== "all" && categoryOf(p) !== opts.cat) return false;
				if (q === "") return true;
				if (labelCat) return categoryOf(p) === labelCat.id;
				if (`${p.name} ${p.owner} ${p.description} ${p.topics.join(" ")}`.toLowerCase().includes(qLower)) return true;
				if (synonyms !== void 0) {
					const catHay = `${p.name} ${p.topics.join(" ")} ${p.description}`.toLowerCase();
					return synonyms.some((en) => catHay.includes(en));
				}
				return false;
			}).sort((a, b) => b.stars - a.stars);
		}
		/**
		* The single verified DeepSeek official GitHub org. `deepseek` (the bare
		* handle) is a dormant placeholder account (public_repos = 0, no blog) and is
		* deliberately NOT treated as official.
		*/
		const OFFICIAL_OWNERS = /* @__PURE__ */ new Set(["deepseek-ai"]);
		/** Whether a repository is an official DeepSeek release. */
		function isOfficial(plugin) {
			return OFFICIAL_OWNERS.has(plugin.owner);
		}
		/** Curated user scenarios that map onto community plugin clusters. */
		const SCENARIOS = [
			{
				id: "writing",
				id2: "writing",
				keywords: [
					"write",
					"note",
					"memory",
					"template",
					"blog",
					"doc",
					"content",
					"skill",
					"memo",
					"recall",
					"remember"
				],
				match: /write|writing|note|memo|skill|memory|template|blog|content|doc|recall|remember/i
			},
			{
				id: "dev",
				id2: "dev",
				keywords: [
					"terminal",
					"git",
					"docker",
					"code",
					"debug",
					"runtime",
					"sandbox",
					"browser",
					"cli",
					"tui",
					"shell",
					"dev"
				],
				match: /terminal|tui|shell|cli|git|docker|code|dev|debug|runtime|sandbox|browser/i
			},
			{
				id: "model",
				id2: "model",
				keywords: [
					"model",
					"llm",
					"provider",
					"gateway",
					"inference",
					"api",
					"openai",
					"anthropic",
					"gemini",
					"claude"
				],
				match: /model|provider|llm|api|gateway|inference|openai|anthropic|gemini|claude/i
			},
			{
				id: "automation",
				id2: "automation",
				keywords: [
					"tool",
					"workflow",
					"schedule",
					"task",
					"agent",
					"pipeline",
					"command",
					"todo",
					"job",
					"automation"
				],
				match: /tool|command|automation|workflow|schedule|task|todo|job|agent|pipeline/i
			},
			{
				id: "notify",
				id2: "notify",
				keywords: [
					"notify",
					"webhook",
					"slack",
					"wechat",
					"telegram",
					"email",
					"push",
					"notification",
					"feishu",
					"dingtalk",
					"im"
				],
				match: /notify|notification|webhook|slack|wechat|feishu|telegram|dingtalk|email|im|push/i
			}
		];
		/**
		* Plugins matching a scenario with duplicate filtering: each functional
		* keyword cluster keeps the top {@link MAX_PER_FUNCTION} by stars plus
		* {@link NEW_PROJECTS_PER_FUNCTION} most-recently-updated newcomers, so a
		* scenario stays lean without ignoring fresh projects.
		*/
		function scenarioPlugins(listing, scenario) {
			const matched = (listing?.plugins ?? []).filter((p) => {
				const hay = `${p.name} ${p.description} ${p.topics.join(" ")}`;
				return scenario.match.test(hay);
			});
			const byKeyword = /* @__PURE__ */ new Map();
			for (const plugin of matched) {
				const hay = `${plugin.name} ${plugin.description} ${plugin.topics.join(" ")}`.toLowerCase();
				const keyword = scenario.keywords.find((k) => hay.includes(k)) ?? "other";
				const group = byKeyword.get(keyword);
				if (group === void 0) byKeyword.set(keyword, [plugin]);
				else group.push(plugin);
			}
			const picked = /* @__PURE__ */ new Map();
			for (const group of byKeyword.values()) {
				const byStars = [...group].sort((a, b) => b.stars - a.stars || b.updatedAt.localeCompare(a.updatedAt)).slice(0, 3);
				const byRecent = [...group].filter((p) => !byStars.some((s) => s.htmlUrl === p.htmlUrl)).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 1);
				for (const plugin of [...byStars, ...byRecent]) picked.set(plugin.htmlUrl, plugin);
			}
			return [...picked.values()].sort((a, b) => b.stars - a.stars || b.updatedAt.localeCompare(a.updatedAt));
		}
		//#endregion
		//#region src/client/index.ts
		/**
		* dsh-discovery client: the sidebar entry (under New Session) opens a
		* full-screen discovery browser. Read-only by design — listing comes from the
		* host's read-only GitHub proxy, and opening a repo is a plain external link.
		* There is deliberately no install / update / uninstall surface here:
		* installation happens via `dsh plugin add` after the user reviews a repo.
		*/
		const name = "dsh-discovery";
		const inject = [
			"slots",
			"locale",
			"sessions",
			"workspaces"
		];
		/** Listing 缓存：sessionStorage（关闭标签页 = app 重启即清空）+ TTL 定时过期。 */
		const LISTING_TTL_MS = 600 * 1e3;
		const LISTING_CACHE_KEY = "dshd.listing.cache.v1";
		function readListingCache() {
			try {
				const raw = sessionStorage.getItem(LISTING_CACHE_KEY);
				if (raw === null) return null;
				const parsed = JSON.parse(raw);
				return Date.now() - parsed.at < LISTING_TTL_MS ? parsed.data : null;
			} catch {
				return null;
			}
		}
		function writeListingCache(data) {
			try {
				sessionStorage.setItem(LISTING_CACHE_KEY, JSON.stringify({
					at: Date.now(),
					data
				}));
			} catch {}
		}
		/** DHS ui-primitives IconCordisPluginOutline14 path (linear plugin glyph). */
		const PLUGIN_ICON_PATH = "M3.03426 5.66661L1.70084 7.00003L3.0315 8.33069L2.14762 9.21457L-0.0669245 7.00003L2.15038 4.78273L3.03426 5.66661ZM7 14.067L4.77924 11.8462L5.66313 10.9623L7 12.2992L8.33342 10.9658L9.2173 11.8496L7 14.067ZM11.8489 9.21803L10.965 8.33414L12.2992 7.00003L10.9623 5.66316L11.8462 4.77927L14.0669 7.00003L11.8489 9.21803ZM8.33066 3.03153L7 1.70087L5.66589 3.03498L4.782 2.1511L7 -0.0668945L9.21454 2.14765L8.33066 3.03153Z";
		function PluginIcon({ size = 14 }) {
			return (0, react.createElement)("svg", {
				width: size,
				height: size,
				viewBox: "0 0 14 14",
				fill: "none",
				xmlns: "http://www.w3.org/2000/svg",
				style: { flexShrink: 0 }
			}, (0, react.createElement)("g", { clipPath: "url(#dshd-plug-clip)" }, (0, react.createElement)("path", {
				d: PLUGIN_ICON_PATH,
				fill: "currentColor"
			}), (0, react.createElement)("rect", {
				x: 5.98535,
				y: 5.98535,
				width: 2.02942,
				height: 2.02942,
				fill: "currentColor"
			})), (0, react.createElement)("defs", null, (0, react.createElement)("clipPath", { id: "dshd-plug-clip" }, (0, react.createElement)("rect", {
				width: 14,
				height: 14,
				fill: "currentColor"
			}))));
		}
		const btnStyle = {
			display: "flex",
			alignItems: "center",
			gap: 6,
			width: "100%",
			height: 38,
			padding: "8px 16px",
			boxSizing: "border-box",
			background: "transparent",
			border: "none",
			borderRadius: 12,
			color: "var(--dsw-alias-label-primary, #c6c8d4)",
			font: "500 14px system-ui",
			lineHeight: "22px",
			cursor: "pointer",
			textAlign: "left",
			overflow: "hidden",
			transition: "background-color .15s ease, color .15s ease, transform .15s ease"
		};
		const btnHoverStyle = {
			background: "var(--dsw-alias-interactive-bg-hover, rgba(255,255,255,.06))",
			color: "var(--dsw-alias-label-primary, #e0e0f0)"
		};
		const railStyle = {
			...btnStyle,
			justifyContent: "center",
			width: 36,
			height: 36,
			padding: 0,
			borderRadius: 8,
			color: "var(--dsw-alias-label-secondary, #9aa0b4)"
		};
		const maskStyle = {
			position: "fixed",
			inset: 0,
			background: "rgba(8,8,16,.6)",
			zIndex: 1e3
		};
		const panelStyle = {
			position: "absolute",
			inset: "28px 32px",
			maxWidth: 1180,
			margin: "0 auto",
			background: "var(--dsw-alias-bg-layer-1, #14141f)",
			border: "1px solid var(--dsw-alias-border-l2, #2e2e4a)",
			borderRadius: 16,
			boxShadow: "0 24px 64px rgba(0,0,0,.5)",
			display: "flex",
			flexDirection: "column",
			overflow: "hidden"
		};
		const headerStyle = {
			display: "flex",
			alignItems: "center",
			gap: 12,
			padding: "14px 20px",
			color: "var(--dsw-alias-label-primary, #e0e0f0)",
			font: "600 15px system-ui",
			flexShrink: 0
		};
		const closeStyle = {
			marginLeft: "auto",
			background: "var(--dsw-alias-button-elevated-fill, #2a2a4a)",
			color: "var(--dsw-alias-label-primary, #e0e0f0)",
			border: "1px solid var(--dsw-alias-border-l2, #3a3a5a)",
			borderRadius: 6,
			padding: "4px 12px",
			cursor: "pointer",
			font: "12px system-ui"
		};
		const bodyStyle = {
			flex: 1,
			overflowY: "auto",
			padding: "16px 20px 24px"
		};
		const searchStyle = {
			width: "100%",
			padding: "8px 12px",
			borderRadius: 8,
			boxSizing: "border-box",
			border: "1px solid var(--dsw-alias-border-l2, #3a3a5a)",
			background: "var(--dsw-alias-bg-layer-2, #1c1c2e)",
			color: "var(--dsw-alias-label-primary, #e0e0f0)",
			font: "13px system-ui",
			outline: "none",
			marginBottom: 12
		};
		const catRowStyle = {
			display: "flex",
			gap: 6,
			flexWrap: "wrap",
			marginBottom: 14
		};
		const catStyle = {
			border: "none",
			background: "transparent",
			color: "var(--dsw-alias-label-secondary, #9aa0b4)",
			fontSize: 12,
			padding: "4px 12px",
			borderRadius: 999,
			cursor: "pointer",
			transition: "background-color .15s ease, color .15s ease"
		};
		const catOnStyle = {
			...catStyle,
			background: "var(--dsw-alias-bg-layer-2, #2a2a4a)",
			color: "var(--dsw-alias-brand-primary, #7aa2ff)",
			fontWeight: 600
		};
		const gridStyle = {
			display: "grid",
			gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
			gap: 12
		};
		const onlineNoteStyle = {
			fontSize: 11,
			lineHeight: "16px",
			color: "var(--dsw-alias-label-secondary, #7c7c9c)",
			background: "var(--dsw-alias-bg-layer-2, #1c1c2e)",
			borderRadius: 8,
			padding: "6px 12px",
			marginBottom: 12
		};
		const cardStyle = {
			background: "var(--dsw-alias-bg-layer-1, #1a1a2b)",
			border: "1px solid var(--dsw-alias-border-l2, #2e2e4a)",
			borderRadius: 12,
			padding: "14px 16px",
			display: "flex",
			flexDirection: "column",
			gap: 8,
			transition: "border-color .15s ease, transform .15s ease"
		};
		const nameStyle = {
			fontSize: 14,
			fontWeight: 600,
			color: "var(--dsw-alias-label-primary, #e0e0f0)",
			overflow: "hidden",
			textOverflow: "ellipsis",
			whiteSpace: "nowrap"
		};
		const ownerStyle = {
			fontSize: 11,
			color: "var(--dsw-alias-label-secondary, #7c7c9c)"
		};
		const descStyle = {
			fontSize: 12,
			lineHeight: "18px",
			color: "var(--dsw-alias-label-tertiary, #9aa0b4)",
			minHeight: 36,
			margin: 0,
			display: "-webkit-box",
			WebkitLineClamp: 2,
			WebkitBoxOrient: "vertical",
			overflow: "hidden"
		};
		const metaStyle = {
			display: "flex",
			alignItems: "center",
			gap: 10,
			fontSize: 11,
			color: "var(--dsw-alias-label-secondary, #7c7c9c)",
			marginTop: "auto"
		};
		const repoBtnStyle = {
			marginLeft: "auto",
			border: "1px solid var(--dsw-alias-border-l2, #3a3a5a)",
			background: "var(--dsw-alias-button-elevated-fill, #2a2a4a)",
			color: "var(--dsw-alias-label-primary, #e0e0f0)",
			borderRadius: 6,
			padding: "4px 10px",
			cursor: "pointer",
			fontSize: 11,
			textDecoration: "none",
			transition: "border-color .15s ease, background-color .15s ease"
		};
		const disclaimerStyle = {
			fontSize: 11,
			lineHeight: "16px",
			color: "var(--dsw-alias-label-tertiary, #7c7c9c)",
			background: "var(--dsw-alias-bg-layer-2, #1c1c2e)",
			borderRadius: 8,
			padding: "8px 12px",
			margin: "0 0 12px"
		};
		const loadingStyle = {
			textAlign: "center",
			color: "var(--dsw-alias-label-secondary, #9aa0b4)",
			fontSize: 13,
			padding: 48
		};
		const emptyStyle = {
			textAlign: "center",
			color: "var(--dsw-alias-label-secondary, #9aa0b4)",
			fontSize: 13,
			padding: 32
		};
		const badgeOfficialStyle = {
			display: "inline-flex",
			alignItems: "center",
			fontSize: 10,
			fontWeight: 600,
			color: "#ffffff",
			padding: "2px 8px",
			borderRadius: 999,
			lineHeight: "16px",
			background: "var(--dsw-static-deepseek-500, #4176E6)",
			flexShrink: 0
		};
		const badgeThirdStyle = {
			display: "inline-flex",
			alignItems: "center",
			fontSize: 10,
			fontWeight: 600,
			color: "var(--dsw-alias-label-tertiary, #7c7c9c)",
			padding: "1px 7px",
			borderRadius: 999,
			lineHeight: "16px",
			border: "1px solid currentColor",
			flexShrink: 0
		};
		const installedBadgeStyle = {
			marginLeft: "auto",
			display: "inline-flex",
			alignItems: "center",
			flexShrink: 0
		};
		const cardFooterStyle = {
			display: "flex",
			alignItems: "center",
			gap: 8,
			marginTop: "auto"
		};
		const cardBtnGroupStyle = {
			display: "flex",
			alignItems: "center",
			gap: 6,
			marginLeft: "auto"
		};
		const cardBtnStyle = {
			border: "1px solid var(--dsw-alias-border-l2, #3a3a5a)",
			background: "var(--dsw-alias-button-elevated-fill, #2a2a4a)",
			color: "var(--dsw-alias-label-primary, #e0e0f0)",
			borderRadius: 6,
			padding: "4px 10px",
			cursor: "pointer",
			fontSize: 11,
			transition: "border-color .15s ease, background-color .15s ease, color .15s ease"
		};
		const cardBtnPrimaryStyle = {
			...cardBtnStyle,
			color: "var(--dsw-static-deepseek-500, #4176E6)"
		};
		/** Hover micro-interaction for card / scenario / header buttons (CSS class). */
		const HOVER_CSS = ".dshd-btn:hover{background:var(--dsw-alias-interactive-bg-hover,rgba(255,255,255,.08)) !important;border-color:var(--dsw-alias-brand-primary,#7aa2ff) !important}";
		const tabRowStyle = {
			display: "flex",
			gap: 4,
			marginBottom: 12
		};
		const tabStyle = {
			border: "none",
			background: "transparent",
			color: "var(--dsw-alias-label-secondary, #9aa0b4)",
			fontSize: 13,
			padding: "8px 16px",
			cursor: "pointer",
			borderRadius: 8,
			transition: "background-color .15s ease, color .15s ease"
		};
		const tabOnStyle = {
			...tabStyle,
			background: "var(--dsw-static-deepseek-500, #4176E6)",
			color: "#ffffff",
			fontWeight: 600
		};
		const scenarioCardStyle = {
			background: "var(--dsw-alias-bg-layer-1, #1a1a2b)",
			border: "1px solid var(--dsw-alias-border-l2, #2e2e4a)",
			borderRadius: 12,
			padding: "16px",
			display: "flex",
			flexDirection: "column",
			gap: 10
		};
		const scenarioTitleStyle = {
			fontSize: 14,
			fontWeight: 600,
			color: "var(--dsw-alias-label-primary, #e0e0f0)"
		};
		const scenarioDescStyle = {
			fontSize: 12,
			lineHeight: "18px",
			color: "var(--dsw-alias-label-tertiary, #9aa0b4)",
			minHeight: 18
		};
		const scenarioCountStyle = {
			fontSize: 11,
			color: "var(--dsw-alias-label-secondary, #7c7c9c)"
		};
		const scenarioBtnRowStyle = {
			display: "flex",
			gap: 8,
			marginTop: 4
		};
		const repoPanelStyle = {
			position: "absolute",
			inset: "28px 32px",
			maxWidth: 900,
			margin: "0 auto",
			background: "var(--dsw-alias-bg-layer-1, #14141f)",
			border: "1px solid var(--dsw-alias-border-l2, #2e2e4a)",
			borderRadius: 16,
			boxShadow: "0 24px 64px rgba(0,0,0,.5)",
			display: "flex",
			flexDirection: "column",
			overflow: "hidden",
			zIndex: 1100
		};
		const mdBodyStyle = {
			flex: 1,
			overflowY: "auto",
			padding: "16px 20px",
			font: "13px/1.7 system-ui",
			color: "var(--dsw-alias-label-secondary, #c6c8d4)"
		};
		const mdH1Style = {
			fontSize: 22,
			fontWeight: 700,
			margin: "20px 0 10px",
			color: "var(--dsw-alias-label-primary, #e0e0f0)",
			borderBottom: "1px solid var(--dsw-alias-border-l2, #2e2e4a)",
			paddingBottom: 8
		};
		const mdH2Style = {
			fontSize: 18,
			fontWeight: 600,
			margin: "18px 0 8px",
			color: "var(--dsw-alias-label-primary, #e0e0f0)"
		};
		const mdH3Style = {
			fontSize: 15,
			fontWeight: 600,
			margin: "14px 0 6px",
			color: "var(--dsw-alias-label-primary, #e0e0f0)"
		};
		const mdParaStyle = {
			fontSize: 13,
			lineHeight: "22px",
			margin: "8px 0"
		};
		const mdCodeBlockStyle = {
			background: "var(--dsw-alias-bg-layer-2, #1c1c2e)",
			border: "1px solid var(--dsw-alias-border-l2, #2e2e4a)",
			borderRadius: 8,
			padding: "12px 14px",
			margin: "10px 0",
			overflowX: "auto",
			font: "12px/1.6 ui-monospace, SFMono-Regular, Menlo, monospace",
			color: "var(--dsw-alias-label-primary, #e0e0f0)",
			whiteSpace: "pre"
		};
		const mdInlineCodeStyle = {
			background: "var(--dsw-alias-bg-layer-2, #1c1c2e)",
			borderRadius: 4,
			padding: "1px 5px",
			font: "12px ui-monospace, Menlo, monospace",
			color: "var(--dsw-alias-brand-primary, #7aa2ff)"
		};
		const mdListItemStyle = {
			fontSize: 13,
			lineHeight: "22px",
			margin: "3px 0",
			paddingLeft: 4
		};
		const mdQuoteStyle = {
			borderLeft: "3px solid var(--dsw-alias-brand-primary, #7aa2ff)",
			padding: "4px 12px",
			margin: "10px 0",
			color: "var(--dsw-alias-label-tertiary, #9aa0b4)"
		};
		const mdLinkStyle = {
			color: "var(--dsw-alias-brand-primary, #7aa2ff)",
			textDecoration: "none"
		};
		function StarIcon() {
			return (0, react.createElement)("svg", {
				width: 11,
				height: 11,
				viewBox: "0 0 14 14",
				fill: "currentColor",
				style: { flexShrink: 0 }
			}, (0, react.createElement)("path", { d: "M7 0.5L8.9 4.8L13.5 5.3L10.2 8.4L11 13L7 10.7L3 13L3.8 8.4L0.5 5.3L5.1 4.8L7 0.5Z" }));
		}
		/** 已安装对勾图标（平面 SVG：浅蓝圆底 + 蓝色对勾）。 */
		function InstalledIcon() {
			return (0, react.createElement)("svg", {
				width: 13,
				height: 13,
				viewBox: "0 0 14 14",
				fill: "none",
				xmlns: "http://www.w3.org/2000/svg",
				style: { flexShrink: 0 }
			}, (0, react.createElement)("circle", {
				cx: 7,
				cy: 7,
				r: 6.2,
				fill: "var(--dsw-static-deepseek-500, #4176E6)",
				opacity: .16
			}), (0, react.createElement)("path", {
				d: "M4 7.2L6.2 9.4L10.2 5.2",
				stroke: "var(--dsw-static-deepseek-500, #4176E6)",
				strokeWidth: 1.5,
				strokeLinecap: "round",
				strokeLinejoin: "round"
			}));
		}
		/** 是否已安装：仓库名匹配已安装包名（忽略 npm scope 前缀与大小写）。 */
		function isInstalled(plugin, installed) {
			return new Set(installed.map((n) => (n.split("/").pop() ?? n).toLowerCase())).has(plugin.name.toLowerCase());
		}
		/** ISO 时间 → 本地 HH:mm。 */
		function formatTime(iso) {
			const d = new Date(iso);
			if (Number.isNaN(d.getTime())) return iso;
			return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
		}
		/** ISO 时间 → YYYY-MM-DD。 */
		function formatDate(iso) {
			const d = new Date(iso);
			if (Number.isNaN(d.getTime())) return iso;
			return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
		}
		function PluginCard({ plugin, t, installed, onReview, onViewRepo, onCheckUpdate }) {
			const official = isOfficial(plugin);
			return (0, react.createElement)("div", { style: cardStyle }, (0, react.createElement)("div", { style: {
				display: "flex",
				alignItems: "center",
				gap: 8,
				minWidth: 0
			} }, (0, react.createElement)("div", { style: {
				width: 30,
				height: 30,
				borderRadius: 8,
				background: "var(--dsw-alias-bg-layer-2, #2a2a4a)",
				display: "grid",
				placeItems: "center",
				flexShrink: 0
			} }, (0, react.createElement)(PluginIcon, { size: 14 })), (0, react.createElement)("div", { style: { minWidth: 0 } }, (0, react.createElement)("div", { style: nameStyle }, plugin.name), (0, react.createElement)("div", { style: ownerStyle }, `${plugin.owner} / ${plugin.name}`)), installed && (0, react.createElement)("span", {
				style: installedBadgeStyle,
				title: t("installedTooltip")
			}, (0, react.createElement)(InstalledIcon))), (0, react.createElement)("p", { style: descStyle }, plugin.description || "—"), (0, react.createElement)("div", { style: metaStyle }, (0, react.createElement)("span", { style: {
				display: "inline-flex",
				alignItems: "center",
				gap: 3
			} }, (0, react.createElement)(StarIcon), plugin.stars), plugin.language !== null && (0, react.createElement)("span", null, plugin.language), plugin.updatedAt !== "" && (0, react.createElement)("span", null, t("updated") + " " + plugin.updatedAt.slice(0, 10))), (0, react.createElement)("div", { style: cardFooterStyle }, (0, react.createElement)("span", { style: official ? badgeOfficialStyle : badgeThirdStyle }, official ? t("official") : t("thirdParty")), (0, react.createElement)("div", { style: cardBtnGroupStyle }, installed ? (0, react.createElement)("button", {
				type: "button",
				className: "dshd-btn",
				style: cardBtnPrimaryStyle,
				title: t("checkUpdate"),
				onClick: () => onCheckUpdate(plugin)
			}, t("checkUpdate")) : (0, react.createElement)("button", {
				type: "button",
				className: "dshd-btn",
				style: cardBtnPrimaryStyle,
				title: t("reviewInstall"),
				onClick: () => onReview(plugin)
			}, t("reviewInstall")), (0, react.createElement)("button", {
				type: "button",
				className: "dshd-btn",
				style: cardBtnStyle,
				title: t("viewRepo"),
				onClick: () => onViewRepo(plugin)
			}, t("viewRepo")))));
		}
		/** Resolve the target workspace, open a fresh session, and send one prompt into it. */
		async function openSessionAndSend(ctx, text) {
			const ws = ctx.workspaces.list.getSnapshot();
			const current = ctx.sessions.list.getSnapshot().current;
			const target = (current === void 0 ? void 0 : ws.items.find((item) => item.sessionIds.includes(current))?.workspaceId) ?? ws.recentWorkspaceId;
			if (target === void 0) {
				ctx.workspaces.startSession();
				return false;
			}
			const sessionId = await ctx.workspaces.connectWorkspace(target);
			ctx.sessions.open(sessionId);
			const scoped = ctx.sessions.scope(sessionId);
			if (scoped === void 0) return false;
			await scoped.get("conversation").send(text);
			return true;
		}
		function buildReviewPrompt(plugin, t) {
			return [
				`请审查并安装插件仓库：${plugin.htmlUrl}（${plugin.owner}/${plugin.name}）`,
				"",
				"请先审查该仓库源码（README、package.json、入口代码、依赖），重点确认：",
				"1. 无恶意行为（异常网络请求、文件读写、环境变量/密钥窃取、命令执行）",
				"2. 与描述相符，无隐藏后门",
				"3. 许可证与依赖安全",
				"",
				"审查通过后，使用 dsh plugin add 安装该插件。若发现风险，请列出风险点并停止安装。",
				"",
				t("networkNote")
			].join("\n");
		}
		function buildCheckUpdatePrompt(plugin) {
			return [
				`请检查已安装插件 ${plugin.owner}/${plugin.name} 是否有可用更新：${plugin.htmlUrl}`,
				"",
				"请检查该插件的当前安装版本与最新版本（npm registry 或 GitHub releases）：",
				"1. 对比已安装版本与最新版本",
				"2. 如有更新，简述更新内容（changelog / releases）",
				"3. 更新前必须先审查新版本的安全性（重点对比新旧版本差异，警惕供应链投毒/维护者账号被盗）：",
				"   - 依赖变更：新增了哪些依赖？来源是否可信？有无依赖投毒风险？",
				"   - 代码变更：是否新增网络请求、文件读写、环境变量/密钥访问、命令执行等敏感行为？",
				"   - 权限变化：是否要求额外权限或修改配置？",
				"4. 审查通过后才使用 dsh plugin update 更新；若发现任何风险，列出风险点并停止更新"
			].join("\n");
		}
		/**
		* 一键更新 prompt：版本比对已由代码完成（确定性操作），清单是「哪些插件有更新 + 新旧版本」，
		* LLM 只负责对每个候选做安全审查（依赖/代码/权限变更）与安装执行。
		*/
		function buildBulkUpdatePrompt(updates, t) {
			return [
				"以下已安装插件有可用更新（版本比对已由插件搜索插件代码完成：npm registry 最新版 + GitHub 远端 commit 基线）：",
				"",
				...updates.map((p) => {
					const target = p.source === "github" ? `GitHub 远端最新提交 ${p.remotePushedAt !== null ? formatDate(p.remotePushedAt) : "?"}` : `npm 最新版 ${p.latest ?? "?"}`;
					return `- ${p.name}：当前 ${p.current} → ${target}`;
				}),
				"",
				"请逐个更新，但更新前必须先安全审查每个插件的新版本（重点对比新旧版本差异，警惕供应链投毒/维护者账号被盗）：",
				"1. 依赖变更：新增了哪些依赖？来源是否可信？有无投毒风险？",
				"2. 代码变更：是否新增网络请求、文件读写、环境变量/密钥访问、命令执行等敏感行为？",
				"3. 权限变化：是否要求额外权限或修改配置？",
				"",
				"审查通过后才使用 dsh plugin update 更新该插件；若发现任何风险，列出风险点并停止更新该插件。",
				"完成后简述：更新了哪些、跳过了哪些及原因。",
				"",
				t("networkNote")
			].join("\n");
		}
		function scenarioLines(plugins) {
			return plugins.slice(0, 20).map((p) => `- ${p.owner}/${p.name}（⭐${p.stars}，更新于 ${p.updatedAt.slice(0, 10)}）：${p.description || "—"}`);
		}
		function buildScenarioBatchPrompt(scenario, plugins, t) {
			return [
				`请为「${t(`scenario_${scenario.id}`)}」场景安装匹配插件。`,
				"",
				`场景需求：${t(`scenario_${scenario.id}_desc`)}`,
				"",
				"候选插件清单（已按 star 数排序）：",
				...scenarioLines(plugins),
				"",
				"请自主判断并安装：",
				"1. 不要安装功能重复的插件（同类功能只选最优，以 star 数和更新时间为准）",
				"2. 安装前先审查每个候选仓库的安全性",
				"3. 使用 dsh plugin add 安装筛选后的插件",
				"4. 完成后简述安装了哪些、为什么选它们",
				"",
				t("networkNote")
			].join("\n");
		}
		function buildScenarioCustomPrompt(scenario, plugins, t) {
			return [
				`请为「${t(`scenario_${scenario.id}`)}」场景评估插件。`,
				"",
				`场景需求：${t(`scenario_${scenario.id}_desc`)}`,
				"",
				"候选插件清单（已按 star 数排序）：",
				...scenarioLines(plugins),
				"",
				"请评估后给出推荐列表和推荐理由（先不要安装）：",
				"1. 推荐安装哪些插件、各自理由",
				"2. 不推荐哪些、原因（功能重复 / 质量 / 安全）",
				"3. 等我确认后再安装",
				"",
				t("networkNote")
			].join("\n");
		}
		function renderInline(text) {
			const nodes = [];
			const regex = /(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*|\[[^\]]+\]\([^)]+\))/g;
			let last = 0;
			let key = 0;
			let match;
			while ((match = regex.exec(text)) !== null) {
				if (match.index > last) nodes.push(text.slice(last, match.index));
				const token = match[0];
				if (token.startsWith("`")) nodes.push((0, react.createElement)("code", {
					key: key++,
					style: mdInlineCodeStyle
				}, token.slice(1, -1)));
				else if (token.startsWith("**")) nodes.push((0, react.createElement)("strong", { key: key++ }, token.slice(2, -2)));
				else if (token.startsWith("*")) nodes.push((0, react.createElement)("em", { key: key++ }, token.slice(1, -1)));
				else {
					const link = token.match(/\[([^\]]+)\]\(([^)]+)\)/);
					if (link) nodes.push((0, react.createElement)("a", {
						key: key++,
						href: link[2],
						target: "_blank",
						rel: "noreferrer",
						style: mdLinkStyle
					}, link[1]));
				}
				last = match.index + token.length;
			}
			if (last < text.length) nodes.push(text.slice(last));
			return nodes;
		}
		function renderMarkdown(md) {
			const lines = md.split("\n");
			const nodes = [];
			let key = 0;
			let inCode = false;
			let codeLines = [];
			let i = 0;
			const flushCode = () => {
				if (codeLines.length > 0) {
					nodes.push((0, react.createElement)("pre", {
						key: key++,
						style: mdCodeBlockStyle
					}, (0, react.createElement)("code", null, codeLines.join("\n"))));
					codeLines = [];
				}
			};
			while (i < lines.length) {
				const line = lines[i];
				if (line.trimStart().startsWith("```")) {
					if (inCode) {
						flushCode();
						inCode = false;
					} else inCode = true;
					i++;
					continue;
				}
				if (inCode) {
					codeLines.push(line);
					i++;
					continue;
				}
				if (line.trim() === "") {
					i++;
					continue;
				}
				const hMatch = line.match(/^(#{1,6})\s+(.*)$/);
				if (hMatch) {
					const level = hMatch[1].length;
					const style = level <= 1 ? mdH1Style : level === 2 ? mdH2Style : mdH3Style;
					const tag = level <= 1 ? "h1" : level === 2 ? "h2" : "h3";
					nodes.push((0, react.createElement)(tag, {
						key: key++,
						style
					}, renderInline(hMatch[2])));
					i++;
					continue;
				}
				const ulMatch = line.match(/^\s*[-*+]\s+(.*)$/);
				if (ulMatch) {
					nodes.push((0, react.createElement)("div", {
						key: key++,
						style: mdListItemStyle
					}, (0, react.createElement)("span", { style: { color: "var(--dsw-alias-brand-primary, #7aa2ff)" } }, "• "), renderInline(ulMatch[1])));
					i++;
					continue;
				}
				const olMatch = line.match(/^\s*(\d+)\.\s+(.*)$/);
				if (olMatch) {
					nodes.push((0, react.createElement)("div", {
						key: key++,
						style: mdListItemStyle
					}, (0, react.createElement)("span", { style: { color: "var(--dsw-alias-label-secondary, #7c7c9c)" } }, `${olMatch[1]}. `), renderInline(olMatch[2])));
					i++;
					continue;
				}
				const quoteMatch = line.match(/^\s*>\s?(.*)$/);
				if (quoteMatch) {
					nodes.push((0, react.createElement)("blockquote", {
						key: key++,
						style: mdQuoteStyle
					}, renderInline(quoteMatch[1])));
					i++;
					continue;
				}
				nodes.push((0, react.createElement)("p", {
					key: key++,
					style: mdParaStyle
				}, renderInline(line)));
				i++;
			}
			if (inCode) flushCode();
			return nodes;
		}
		function RepoPreview({ plugin, t, onClose }) {
			const [state, setState] = (0, react.useState)("loading");
			const [readme, setReadme] = (0, react.useState)("");
			(0, react.useEffect)(() => {
				setState("loading");
				setReadme("");
				const url = `/dsh-discovery/readme?owner=${encodeURIComponent(plugin.owner)}&repo=${encodeURIComponent(plugin.name)}`;
				fetch(url, { cache: "no-store" }).then((res) => {
					if (!res.ok) throw new Error("HTTP " + String(res.status));
					return res.json();
				}).then((body) => {
					setReadme(body.markdown);
					setState("done");
				}).catch(() => setState("error"));
			}, [plugin.owner, plugin.name]);
			return (0, react.createElement)("div", {
				style: maskStyle,
				onClick: onClose
			}, (0, react.createElement)("div", {
				style: repoPanelStyle,
				onClick: (e) => e.stopPropagation()
			}, (0, react.createElement)("div", { style: headerStyle }, (0, react.createElement)(PluginIcon, { size: 15 }), (0, react.createElement)("span", { style: { flex: 1 } }, `${plugin.owner}/${plugin.name}`), (0, react.createElement)("a", {
				href: plugin.htmlUrl,
				target: "_blank",
				rel: "noreferrer",
				className: "dshd-btn",
				style: repoBtnStyle,
				title: t("openOnGitHub")
			}, t("openOnGitHub")), (0, react.createElement)("button", {
				className: "dshd-btn",
				style: closeStyle,
				onClick: onClose,
				"aria-label": "关闭",
				title: "关闭"
			}, "✕")), state === "loading" && (0, react.createElement)("div", { style: loadingStyle }, t("readmeLoading")), state === "error" && (0, react.createElement)("div", { style: emptyStyle }, t("readmeFail")), state === "done" && (readme === "" ? (0, react.createElement)("div", { style: emptyStyle }, t("noReadme")) : (0, react.createElement)("div", { style: mdBodyStyle }, renderMarkdown(readme)))));
		}
		function ScenarioPanel({ listing, t, onInstall, onCustom }) {
			return (0, react.createElement)("div", { style: {
				height: "100%",
				display: "flex",
				flexDirection: "column",
				minWidth: 0
			} }, (0, react.createElement)("p", { style: disclaimerStyle }, `⚠️ ${t("disclaimerBody")}`), (0, react.createElement)("div", { style: {
				fontSize: 13,
				fontWeight: 600,
				color: "var(--dsw-alias-label-primary, #e0e0f0)",
				margin: "0 0 12px"
			} }, t("scenariosTitle")), (0, react.createElement)("div", { style: {
				...bodyStyle,
				flex: 1
			} }, (0, react.createElement)("div", { style: gridStyle }, SCENARIOS.map((scenario) => {
				const matched = scenarioPlugins(listing, scenario);
				return (0, react.createElement)("div", {
					key: scenario.id,
					style: scenarioCardStyle
				}, (0, react.createElement)("div", { style: scenarioTitleStyle }, t(`scenario_${scenario.id}`)), (0, react.createElement)("div", { style: scenarioDescStyle }, t(`scenario_${scenario.id}_desc`)), (0, react.createElement)("div", { style: scenarioCountStyle }, t("scenarioMatchCount").replace("{n}", String(matched.length))), (0, react.createElement)("div", { style: scenarioBtnRowStyle }, (0, react.createElement)("button", {
					type: "button",
					className: "dshd-btn",
					style: cardBtnPrimaryStyle,
					title: t("installAll"),
					onClick: () => onInstall(scenario, matched)
				}, t("installAll")), (0, react.createElement)("button", {
					type: "button",
					className: "dshd-btn",
					style: cardBtnStyle,
					title: t("customInstall"),
					onClick: () => onCustom(scenario, matched)
				}, t("customInstall"))));
			}))));
		}
		function DiscoveryBrowser({ t, ctx, onClose, onFetched }) {
			const [tab, setTab] = (0, react.useState)("browse");
			const [listing, setListing] = (0, react.useState)(null);
			const [loadError, setLoadError] = (0, react.useState)(false);
			const [installed, setInstalled] = (0, react.useState)([]);
			const [installedVersions, setInstalledVersions] = (0, react.useState)(null);
			const [q, setQ] = (0, react.useState)("");
			const [cat, setCat] = (0, react.useState)("all");
			const [preview, setPreview] = (0, react.useState)(null);
			/** GitHub 全文搜索兜底：本地过滤无结果时触发。null=未搜索；[]=已搜无结果。 */
			const [searchResults, setSearchResults] = (0, react.useState)(null);
			const [searching, setSearching] = (0, react.useState)(false);
			const load = () => {
				setLoadError(false);
				const cached = readListingCache();
				if (cached !== null) {
					setListing(cached);
					onFetched(cached.fetchedAt);
					return;
				}
				fetch("/dsh-discovery/listing", { cache: "no-store" }).then((res) => {
					if (!res.ok) throw new Error("HTTP " + String(res.status));
					return res.json();
				}).then((body) => {
					writeListingCache(body);
					setListing(body);
					onFetched(body.fetchedAt);
				}).catch(() => setLoadError(true));
			};
			(0, react.useEffect)(load, []);
			(0, react.useEffect)(() => {
				fetch("/dsh-discovery/installed", { cache: "no-store" }).then((res) => {
					if (!res.ok) return [];
					return res.json();
				}).then((body) => setInstalled(body.installed ?? [])).catch(() => setInstalled([]));
			}, []);
			(0, react.useEffect)(() => {
				fetch("/dsh-discovery/installed-versions", { cache: "no-store" }).then((res) => {
					if (!res.ok) throw new Error("HTTP " + String(res.status));
					return res.json();
				}).then((body) => setInstalledVersions(body.plugins ?? [])).catch(() => setInstalledVersions([]));
			}, []);
			const cats = (0, react.useMemo)(() => orderedCategories(listing), [listing]);
			const plugins = (0, react.useMemo)(() => filterPlugins(listing, {
				q,
				cat
			}), [
				listing,
				q,
				cat
			]);
			const searchTimer = (0, react.useRef)(void 0);
			(0, react.useEffect)(() => {
				const term = q.trim();
				if (term === "" || plugins.length > 0) {
					window.clearTimeout(searchTimer.current);
					setSearchResults(null);
					setSearching(false);
					return;
				}
				setSearching(true);
				window.clearTimeout(searchTimer.current);
				searchTimer.current = window.setTimeout(() => {
					fetch(`/dsh-discovery/search?q=${encodeURIComponent(term)}`, { cache: "no-store" }).then((res) => {
						if (!res.ok) throw new Error("HTTP " + String(res.status));
						return res.json();
					}).then((body) => setSearchResults(body.plugins ?? [])).catch(() => setSearchResults([])).finally(() => setSearching(false));
				}, 400);
				return () => window.clearTimeout(searchTimer.current);
			}, [
				q,
				cat,
				plugins.length
			]);
			const handleReview = (plugin) => {
				onClose();
				openSessionAndSend(ctx, buildReviewPrompt(plugin, t));
			};
			const handleCheckUpdate = (plugin) => {
				onClose();
				openSessionAndSend(ctx, buildCheckUpdatePrompt(plugin));
			};
			const handleInstall = (scenario, matched) => {
				onClose();
				openSessionAndSend(ctx, buildScenarioBatchPrompt(scenario, matched, t));
			};
			const handleCustom = (scenario, matched) => {
				onClose();
				openSessionAndSend(ctx, buildScenarioCustomPrompt(scenario, matched, t));
			};
			const handleUpdateAll = () => {
				const updates = (installedVersions ?? []).filter((p) => p.hasUpdate);
				if (updates.length === 0) return;
				onClose();
				openSessionAndSend(ctx, buildBulkUpdatePrompt(updates, t));
			};
			const fallbackView = plugins.length === 0 && q.trim() !== "" ? searching ? (0, react.createElement)("div", { style: loadingStyle }, t("searchingOnline")) : searchResults !== null && searchResults.length > 0 ? (0, react.createElement)("div", { style: { width: "100%" } }, (0, react.createElement)("div", { style: onlineNoteStyle }, t("searchOnlineResults").replace("{n}", String(searchResults.length))), (0, react.createElement)("div", { style: gridStyle }, searchResults.map((p) => (0, react.createElement)(PluginCard, {
				key: p.htmlUrl,
				plugin: p,
				t,
				installed: isInstalled(p, installed),
				onReview: handleReview,
				onViewRepo: (x) => setPreview(x),
				onCheckUpdate: handleCheckUpdate
			})))) : (0, react.createElement)("div", { style: emptyStyle }, t("empty")) : null;
			return (0, react.createElement)("div", { style: {
				height: "100%",
				display: "flex",
				flexDirection: "column",
				minWidth: 0
			} }, (0, react.createElement)("div", { style: tabRowStyle }, (0, react.createElement)("button", {
				type: "button",
				style: tab === "browse" ? tabOnStyle : tabStyle,
				onClick: () => setTab("browse")
			}, t("all")), (0, react.createElement)("button", {
				type: "button",
				style: tab === "scenario" ? tabOnStyle : tabStyle,
				onClick: () => setTab("scenario")
			}, t("scenariosTab")), (0, react.createElement)("button", {
				type: "button",
				style: tab === "installed" ? tabOnStyle : tabStyle,
				onClick: () => setTab("installed")
			}, t("installedTab"))), tab === "browse" && (0, react.createElement)("div", { style: {
				height: "100%",
				display: "flex",
				flexDirection: "column",
				minWidth: 0
			} }, (0, react.createElement)("p", { style: disclaimerStyle }, `⚠️ ${t("disclaimerBody")}`), (0, react.createElement)("input", {
				style: searchStyle,
				placeholder: t("searchPh"),
				value: q,
				onChange: (e) => setQ(e.target.value)
			}), (0, react.createElement)("div", { style: catRowStyle }, (0, react.createElement)("button", {
				style: cat === "all" ? catOnStyle : catStyle,
				onClick: () => setCat("all")
			}, t("all")), cats.map((c) => (0, react.createElement)("button", {
				key: c.id,
				style: cat === c.id ? catOnStyle : catStyle,
				onClick: () => setCat(c.id)
			}, `${t("category_" + c.id)} (${c.count})`))), (0, react.createElement)("div", { style: {
				fontSize: 11,
				color: "var(--dsw-alias-label-secondary, #7c7c9c)",
				marginBottom: 10
			} }, t("total").replace("{n}", String(listing?.total ?? 0)) + " · " + t("fetchedFrom")), (0, react.createElement)("div", {
				style: bodyStyle,
				flex: 1
			}, loadError && (0, react.createElement)("div", { style: emptyStyle }, t("loadFail") + " — " + t("refresh")), !loadError && listing === null && (0, react.createElement)("div", { style: loadingStyle }, t("loading")), !loadError && listing !== null && plugins.length > 0 && (0, react.createElement)("div", { style: gridStyle }, plugins.map((p) => (0, react.createElement)(PluginCard, {
				key: p.htmlUrl,
				plugin: p,
				t,
				installed: isInstalled(p, installed),
				onReview: handleReview,
				onViewRepo: (x) => setPreview(x),
				onCheckUpdate: handleCheckUpdate
			}))), !loadError && listing !== null && fallbackView, !loadError && listing !== null && plugins.length === 0 && q.trim() === "" && (0, react.createElement)("div", { style: emptyStyle }, t("empty")))), tab === "scenario" && (0, react.createElement)(ScenarioPanel, {
				listing,
				t,
				onInstall: handleInstall,
				onCustom: handleCustom
			}), tab === "installed" && (0, react.createElement)(InstalledPanel, {
				t,
				versions: installedVersions,
				onUpdateAll: handleUpdateAll
			}), preview !== null && (0, react.createElement)(RepoPreview, {
				plugin: preview,
				t,
				onClose: () => setPreview(null)
			}));
		}
		/** 已安装 tab：顶部紧凑一键更新 + 卡片式插件列表（npm + GitHub 多源比对结果）。 */
		function InstalledPanel({ t, versions, onUpdateAll }) {
			const updatable = (versions ?? []).filter((p) => p.hasUpdate);
			const badgeOf = (p) => {
				const base = {
					fontSize: 11,
					padding: "2px 8px",
					borderRadius: 10,
					whiteSpace: "nowrap",
					flexShrink: 0
				};
				if (p.hasUpdate) {
					const src = p.source === "npm" ? t("fromNpm") : p.source === "github" ? t("fromGithub") : "";
					return {
						text: src === "" ? t("updateAvailable") : `${t("updateAvailable")} · ${src}`,
						style: {
							...base,
							background: "#fff4e5",
							color: "#b45309"
						}
					};
				}
				if (p.latest !== null || p.baselineSha !== null) return {
					text: t("upToDate"),
					style: {
						...base,
						background: "#e8f7ee",
						color: "#1a7f37"
					}
				};
				if (p.repo !== null) return {
					text: t("baselineReady"),
					style: {
						...base,
						background: "#e8f0fe",
						color: "#1a56db"
					}
				};
				return {
					text: t("versionUnknown"),
					style: {
						...base,
						background: "#f3f4f6",
						color: "#6b7280"
					}
				};
			};
			const versionLine = (p) => {
				if (p.latest !== null) return `${t("currentVersion")} v${p.current} → ${t("latestVersion")} v${p.latest}`;
				return `${t("currentVersion")} v${p.current}`;
			};
			const metaLine = (p) => {
				const parts = [];
				if (p.latestPublishedAt !== null) parts.push(`${t("fromNpm")} ${formatDate(p.latestPublishedAt)}`);
				if (p.repo !== null && p.remotePushedAt !== null) parts.push(p.baselineSha !== null ? `${t("repoLatest")} ${formatDate(p.remotePushedAt)}` : `${t("baselineReady")} · ${formatDate(p.remotePushedAt)}`);
				return parts.length > 0 ? parts.join(" · ") : "—";
			};
			return (0, react.createElement)("div", { style: {
				height: "100%",
				display: "flex",
				flexDirection: "column",
				minWidth: 0
			} }, (0, react.createElement)("div", { style: {
				padding: "12px 14px",
				borderBottom: "1px solid var(--dsw-alias-divider, #ececf2)",
				display: "flex",
				alignItems: "center",
				gap: 10,
				flexWrap: "wrap"
			} }, (0, react.createElement)("button", {
				type: "button",
				className: "dshd-btn",
				style: {
					...cardBtnPrimaryStyle,
					background: "#4176e6",
					borderColor: "#4176e6",
					color: "#fff",
					padding: "6px 14px",
					fontSize: 12,
					fontWeight: 600,
					opacity: updatable.length === 0 ? .5 : 1,
					cursor: updatable.length === 0 ? "default" : "pointer"
				},
				onClick: onUpdateAll,
				disabled: updatable.length === 0
			}, `${t("updateAll")}${updatable.length > 0 ? ` (${updatable.length})` : ""}`), (0, react.createElement)("span", { style: {
				fontSize: 11,
				color: "var(--dsw-alias-label-secondary, #7c7c9c)"
			} }, t("updateAllNote"))), (0, react.createElement)("div", { style: {
				flex: 1,
				overflowY: "auto",
				padding: 12
			} }, versions === null && (0, react.createElement)("div", { style: loadingStyle }, t("updateLoading")), versions !== null && versions.length === 0 && (0, react.createElement)("div", { style: emptyStyle }, t("noInstalled")), versions !== null && versions.length > 0 && (0, react.createElement)("div", { style: gridStyle }, versions.map((p) => (0, react.createElement)("div", {
				key: p.name,
				style: cardStyle
			}, (0, react.createElement)("div", { style: {
				display: "flex",
				alignItems: "center",
				gap: 8,
				minWidth: 0
			} }, (0, react.createElement)("div", { style: {
				width: 30,
				height: 30,
				borderRadius: 8,
				background: "var(--dsw-alias-bg-layer-2, #2a2a4a)",
				display: "grid",
				placeItems: "center",
				flexShrink: 0
			} }, (0, react.createElement)(PluginIcon, { size: 14 })), (0, react.createElement)("div", { style: { minWidth: 0 } }, (0, react.createElement)("div", { style: nameStyle }, p.name), p.repo !== null && (0, react.createElement)("div", { style: ownerStyle }, p.repo)), (0, react.createElement)("span", { style: badgeOf(p).style }, badgeOf(p).text)), (0, react.createElement)("div", { style: {
				fontSize: 12,
				color: "var(--dsw-alias-label-primary, #e0e0f0)"
			} }, versionLine(p)), (0, react.createElement)("div", { style: metaStyle }, metaLine(p)), (0, react.createElement)("div", { style: cardFooterStyle }, (0, react.createElement)("div", { style: cardBtnGroupStyle }, p.repo !== null && (0, react.createElement)("a", {
				href: `https://github.com/${p.repo}`,
				target: "_blank",
				rel: "noreferrer",
				style: repoBtnStyle
			}, t("viewRepo")))))))));
		}
		function apply(ctx) {
			const NS = "dsh-discovery";
			ctx.effect(() => ctx.locale.register(NS, {
				zh,
				en
			}), "dsh-discovery: dictionaries");
			const t = ctx.locale.bind(NS);
			ctx.slots.inject("sidebar.primary.action", () => ctx.slots.register({
				name: "sidebar.primary.action",
				id: "dsh-discovery",
				order: 1,
				locale: NS
			}, (owner) => (0, react.createElement)(DiscoveryTrigger, {
				wide: owner.wide ?? false,
				t,
				ctx
			})));
		}
		function DiscoveryTrigger({ wide, t, ctx }) {
			const [open, setOpen] = (0, react.useState)(false);
			const [hovered, setHovered] = (0, react.useState)(false);
			const [fetchedAt, setFetchedAt] = (0, react.useState)("");
			const close = () => setOpen(false);
			const closeButton = (0, react.useRef)(null);
			(0, react.useEffect)(() => {
				if (!open) return;
				const onKeyDown = (e) => {
					if (e.key === "Escape") close();
				};
				document.addEventListener("keydown", onKeyDown);
				return () => {
					document.removeEventListener("keydown", onKeyDown);
				};
			}, [open]);
			(0, react.useEffect)(() => {
				if (open) closeButton.current?.focus();
			}, [open]);
			const style = wide ? {
				...btnStyle,
				...hovered ? btnHoverStyle : null
			} : railStyle;
			return (0, react.createElement)("div", { style: { display: "contents" } }, (0, react.createElement)("style", null, HOVER_CSS), (0, react.createElement)("button", {
				type: "button",
				style,
				title: t("nav"),
				"aria-label": t("nav"),
				onMouseEnter: () => setHovered(true),
				onMouseLeave: () => setHovered(false),
				onClick: () => setOpen(true)
			}, (0, react.createElement)(PluginIcon, { size: wide ? 15 : 18 }), wide && (0, react.createElement)("span", { style: {
				flex: 1,
				overflow: "hidden",
				textOverflow: "ellipsis",
				whiteSpace: "nowrap"
			} }, t("nav"))), open && (0, react.createElement)("div", {
				style: maskStyle,
				onClick: close
			}, (0, react.createElement)("div", {
				style: panelStyle,
				onClick: (e) => e.stopPropagation()
			}, (0, react.createElement)("div", { style: headerStyle }, (0, react.createElement)(PluginIcon, { size: 15 }), (0, react.createElement)("span", null, t("nav")), (0, react.createElement)("span", { style: {
				fontSize: 11,
				color: "var(--dsw-alias-label-secondary, #7c7c9c)",
				fontWeight: 400
			} }, t("subtitle")), fetchedAt !== "" && (0, react.createElement)("span", { style: {
				fontSize: 11,
				color: "var(--dsw-alias-label-tertiary, #9aa0b4)",
				fontWeight: 400
			} }, `${t("lastRefresh")} ${formatTime(fetchedAt)}`), (0, react.createElement)("button", {
				ref: closeButton,
				style: closeStyle,
				onClick: close,
				"aria-label": "关闭",
				title: "关闭"
			}, "✕")), (0, react.createElement)("div", { style: {
				flex: 1,
				overflowY: "hidden",
				padding: "0 4px"
			} }, (0, react.createElement)(DiscoveryBrowser, {
				t,
				ctx,
				onClose: close,
				onFetched: setFetchedAt
			})))));
		}
		//#endregion
		exports.apply = apply;
		exports.inject = inject;
		exports.name = name;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map