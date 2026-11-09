// Right-sidebar "Codex Lens" tab: browse the local Codex thread tree, bind one
// thread to the current DSH session, and open a dedicated page for a thread
// (metadata, live rollout feed, workspace file tree).
window.__ModuleLoader__.load({
  id: '@local/dsh-codex-bridge',
  factory(require) {
    const React = require('react')
    const h = React.createElement
    const NS = 'dsh-codex-bridge'
    const TAB_ID = 'dsh-codex-bridge'
    const KIND = 'codex-thread'
    const POLL_MS = 5000
    const LIVE_MS = 2000

    const DICT = {
      zh: {
        'tab.title': 'Codex 透镜',
        'tab.description': '透视一条 Codex 线程：总览、实时活动、文件树与统计',
        'ui.search': '搜索线程、路径或标题',
        'ui.showAll': '显示全部',
        'ui.refresh': '刷新',
        'ui.notBound': '未绑定 Codex 线程',
        'ui.boundTo': '已绑定',
        'ui.pickHint': '点击一条线程，把它绑到当前 DSH 会话',
        'ui.unbind': '解绑',
        'ui.working': 'Codex 正在工作',
        'ui.idle': '空闲',
        'ui.failed': '上一轮失败',
        'ui.interrupted': '上一轮被中断',
        'ui.completed': '上一轮已完成',
        'ui.turns': '轮',
        'ui.empty': '没有找到 Codex 本地数据',
        'ui.emptyHint': '确认 Codex 至少运行过一次，且 ~/.codex 中存在 state_*.sqlite 与 thread_history_*.sqlite',
        'ui.noMatch': '没有匹配的线程',
        'ui.more': '更早的线程',
        'ui.loading': '正在读取 Codex 数据…',
        'ui.sessionRequired': '打开一个 DSH 会话后才能绑定 Codex 线程',
        'ui.boundHint': '已绑定：回到对话里直接提问，或让 DSH 基于这条线程做 PPT / 代码解读',
        'ui.side': '侧边',
        'ui.subagent': '子代理',
        'ui.hideSide': '隐藏侧边/子代理',
        'ui.sideOf': '侧边对话，父线程',
        'ui.detail': '线程详情',
        'ui.back': '返回',
        'ui.status': '状态',
        'ui.threadId': '线程 ID',
        'ui.model': '模型',
        'ui.tokens': '累计 tokens',
        'ui.branch': '分支',
        'ui.created': '创建',
        'ui.updated': '更新',
        'ui.kind': '类型',
        'ui.info': '基本信息',
        'ui.liveTitle': '实时活动',
        'ui.filesTitle': '工作区文件',
        'ui.openWorkspace': '打开工作区',
        'ui.bindToSession': '绑定到当前会话',
        'ui.boundPill': '已绑定',
        'ui.noLive': '本轮暂时没有可显示的实时条目',
        'ui.emptyDir': '空目录',
        'ui.loadingDir': '加载中…',
        'ui.doubleClick': '双击查看线程详情',
        'ui.liveHint': '运行中每 2 秒从 Codex rollout 尾部读取',
        'ui.turnsLabel': '轮次',
        'ui.reveal': '在资源管理器中显示',
        'ui.open': '打开',
        'ui.think': '思考',
        'ui.you': '用户',
        'ui.event': '事件',
        'ui.tool': '工具',
        'ui.started': '开始工作',
        'ui.finished': '完成本轮',
        'ui.noWorkspace': '没有工作区目录',
        'ui.overviewTab': '数据概览',
        'ui.liveTab': '实时活动',
        'ui.filesTab': '工作区文件',
        'ui.kpiTurns': '轮次',
        'ui.kpiSuccess': '成功率',
        'ui.kpiAvg': '平均耗时',
        'ui.kpiFiles': '改动文件',
        'ui.kpiTokens': '累计 tokens',
        'ui.durationChart': '每轮耗时',
        'ui.durationHint': '柱高 = 本轮耗时 · 颜色 = 结果 · 点击查看该轮',
        'ui.composition': '活动构成',
        'ui.itemsUnit': '条目',
        'ui.toolsTitle': '工具与操作',
        'ui.commands': '命令',
        'ui.commandFailed': '失败',
        'ui.mcpCalls': 'MCP 调用',
        'ui.webSearches': '联网搜索',
        'ui.subagents': '子代理',
        'ui.filesTop': '改动最多的文件',
        'ui.firstUser': '起始请求',
        'ui.median': '中位',
        'ui.longest': '最长',
        'ui.add': '新增',
        'ui.update': '修改',
        'ui.delete': '删除',
        'ui.other': '其他',
        'ui.noStats': '暂无统计数据',
        'ui.success': '成功',
        'ui.failedTurn': '失败',
        'ui.interruptedTurn': '中断',
        'ui.runningTurn': '运行中',
        'ui.pickTurn': '选中轮次',
        'ui.turnWord': '轮',
        'ui.durationMin': '分',
        'ui.durationSec': '秒',
        'ui.reasoning': '思考',
        'ui.assistantMsg': 'Codex 回复',
        'ui.userMsg': '用户消息',
        'ui.fileChanges': '文件改动',
        'ui.otherItems': '其他条目',
        'ui.filesUnit': '次',
        'ui.statsHint': '数据来自本地 Codex 历史库与 rollout，只读',
        'ui.activityCurve': '每轮活动量',
        'ui.statusMix': '轮次状态构成',
        'ui.p95': 'P95',
      },
      en: {
        'tab.title': 'Codex Lens',
        'tab.description': 'Inspect a Codex thread: overview, live activity, files and stats',
        'ui.search': 'Search threads, paths, or titles',
        'ui.showAll': 'Show all',
        'ui.refresh': 'Refresh',
        'ui.notBound': 'No Codex thread bound',
        'ui.boundTo': 'Bound',
        'ui.pickHint': 'Click a thread to bind it to this DSH session',
        'ui.unbind': 'Unbind',
        'ui.working': 'Codex is working',
        'ui.idle': 'Idle',
        'ui.failed': 'Last turn failed',
        'ui.interrupted': 'Last turn interrupted',
        'ui.completed': 'Last turn completed',
        'ui.turns': 'turns',
        'ui.empty': 'No local Codex data found',
        'ui.emptyHint': 'Make sure Codex has run at least once and ~/.codex has state_*.sqlite and thread_history_*.sqlite',
        'ui.noMatch': 'No matching threads',
        'ui.more': 'Older threads',
        'ui.loading': 'Reading Codex data…',
        'ui.sessionRequired': 'Open a DSH session before binding a Codex thread',
        'ui.boundHint': 'Bound: ask in the conversation, or let DSH build slides / explain the code from this thread',
        'ui.side': 'Side',
        'ui.subagent': 'Subagent',
        'ui.hideSide': 'Hide side/subagent',
        'ui.sideOf': 'Side conversation of',
        'ui.detail': 'Thread detail',
        'ui.back': 'Back',
        'ui.status': 'Status',
        'ui.threadId': 'Thread ID',
        'ui.model': 'Model',
        'ui.tokens': 'Tokens used',
        'ui.branch': 'Branch',
        'ui.created': 'Created',
        'ui.updated': 'Updated',
        'ui.kind': 'Kind',
        'ui.info': 'Overview',
        'ui.liveTitle': 'Live activity',
        'ui.filesTitle': 'Workspace files',
        'ui.openWorkspace': 'Open workspace',
        'ui.bindToSession': 'Bind to this session',
        'ui.boundPill': 'Bound',
        'ui.noLive': 'No live items recorded for this turn yet',
        'ui.emptyDir': 'Empty directory',
        'ui.loadingDir': 'Loading…',
        'ui.doubleClick': 'Double-click for thread detail',
        'ui.liveHint': 'Polled from the Codex rollout tail every 2s while running',
        'ui.turnsLabel': 'Turns',
        'ui.reveal': 'Reveal in Explorer',
        'ui.open': 'Open',
        'ui.think': 'Thinking',
        'ui.you': 'You',
        'ui.event': 'Event',
        'ui.tool': 'Tool',
        'ui.started': 'started',
        'ui.finished': 'finished',
        'ui.noWorkspace': 'No workspace',
        'ui.overviewTab': 'Overview',
        'ui.liveTab': 'Live',
        'ui.filesTab': 'Files',
        'ui.kpiTurns': 'Turns',
        'ui.kpiSuccess': 'Success',
        'ui.kpiAvg': 'Avg time',
        'ui.kpiFiles': 'Files touched',
        'ui.kpiTokens': 'Tokens',
        'ui.durationChart': 'Turn durations',
        'ui.durationHint': 'Bar height = duration · color = result · click one',
        'ui.composition': 'Activity mix',
        'ui.itemsUnit': 'items',
        'ui.toolsTitle': 'Tools & actions',
        'ui.commands': 'Commands',
        'ui.commandFailed': 'failed',
        'ui.mcpCalls': 'MCP calls',
        'ui.webSearches': 'Web searches',
        'ui.subagents': 'Subagents',
        'ui.filesTop': 'Most changed files',
        'ui.firstUser': 'First request',
        'ui.median': 'median',
        'ui.longest': 'longest',
        'ui.add': 'add',
        'ui.update': 'update',
        'ui.delete': 'delete',
        'ui.other': 'other',
        'ui.noStats': 'No stats yet',
        'ui.success': 'Success',
        'ui.failedTurn': 'Failed',
        'ui.interruptedTurn': 'Interrupted',
        'ui.runningTurn': 'Running',
        'ui.pickTurn': 'Selected turn',
        'ui.turnWord': 'turn',
        'ui.durationMin': 'm',
        'ui.durationSec': 's',
        'ui.reasoning': 'Thinking',
        'ui.assistantMsg': 'Codex reply',
        'ui.userMsg': 'User message',
        'ui.fileChanges': 'File changes',
        'ui.otherItems': 'Other items',
        'ui.filesUnit': 'x',
        'ui.statsHint': 'Read-only data from the local Codex history DB and rollouts',
        'ui.activityCurve': 'Activity per turn',
        'ui.statusMix': 'Turn outcomes',
        'ui.p95': 'P95',
      },
    }

    const CSS = `
.dcb-root{box-sizing:border-box;height:100%;min-height:0;display:flex;flex-direction:column;color:var(--dsw-alias-label-primary);background:var(--dsw-alias-bg-base);font-size:12px;line-height:1.45}
.dcb-head{display:flex;flex-direction:column;gap:2px;padding:10px 12px 8px;border-bottom:1px solid var(--dsw-alias-border-l1)}
.dcb-headTop{display:flex;align-items:baseline;gap:6px}
.dcb-title{font-size:13px;font-weight:600}
.dcb-headSub{color:var(--dsw-alias-label-secondary);font-size:11px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.dcb-tools{display:flex;align-items:center;gap:6px;flex-wrap:wrap;padding:8px 12px 6px}
.dcb-search{flex:1;min-width:0;box-sizing:border-box;background:var(--dsw-alias-bg-layer-2);border:1px solid var(--dsw-alias-border-l2);border-radius:6px;color:var(--dsw-alias-label-primary);font:inherit;font-size:11px;padding:4px 8px;outline:none}
.dcb-search:focus{border-color:var(--dsw-alias-brand-primary)}
.dcb-toggle{display:flex;align-items:center;gap:4px;color:var(--dsw-alias-label-secondary);font-size:11px;white-space:nowrap;cursor:pointer;user-select:none}
.dcb-iconBtn{box-sizing:border-box;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-secondary);border-radius:6px;cursor:pointer;font:inherit;font-size:11px;padding:3px 7px}
.dcb-iconBtn:hover{color:var(--dsw-alias-label-primary);border-color:var(--dsw-alias-label-secondary)}
.dcb-scroll{flex:1;min-height:0;overflow-y:auto;padding:2px 8px 10px}
.dcb-group{margin-top:2px}
.dcb-groupHead{box-sizing:border-box;width:100%;display:flex;align-items:center;gap:6px;padding:5px 6px;background:none;border:0;border-radius:6px;color:var(--dsw-alias-label-secondary);font:inherit;font-size:11px;cursor:pointer;text-align:left}
.dcb-groupHead:hover{background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary)}
.dcb-caret{width:10px;flex:none;opacity:.75;font-size:9px}
.dcb-groupName{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dcb-count{flex:none;font-variant-numeric:tabular-nums;opacity:.8}
.dcb-thread{box-sizing:border-box;width:100%;display:grid;grid-template-columns:8px minmax(0,1fr);column-gap:7px;row-gap:1px;padding:5px 7px;margin:1px 0;background:none;border:1px solid transparent;border-radius:6px;color:inherit;font:inherit;text-align:left;cursor:pointer}
.dcb-thread:hover{background:var(--dsw-alias-bg-layer-2)}
.dcb-threadBound{border-color:var(--dsw-alias-brand-primary)}
.dcb-threadSide{padding-left:16px;margin-left:4px;border-left:2px solid var(--dsw-alias-border-l1);border-radius:0 6px 6px 0}
.dcb-threadSubagent{opacity:.82}
.dcb-badge{display:inline-block;margin-right:5px;padding:0 4px;border:1px solid var(--dsw-alias-border-l2);border-radius:4px;font-size:9px;line-height:14px;color:var(--dsw-alias-label-secondary);vertical-align:1px;white-space:nowrap}
.dcb-dot{width:7px;height:7px;border-radius:50%;margin-top:5px;background:var(--dsw-alias-state-idle-primary)}
.dcb-dot[data-status="running"]{background:var(--dsw-alias-state-success-primary);animation:dcb-pulse 1.4s ease-in-out infinite}
.dcb-dot[data-status="failed"]{background:var(--dsw-alias-state-error-primary)}
.dcb-dot[data-status="interrupted"]{background:var(--dsw-alias-state-warn-primary)}
.dcb-dot[data-status="completed"]{background:var(--dsw-alias-state-idle-primary)}
.dcb-threadTitle{overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;word-break:break-word}
.dcb-threadMeta{grid-column:2;color:var(--dsw-alias-label-secondary);font-size:10px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.dcb-older{margin:1px 0 2px 14px}
.dcb-olderBtn{background:none;border:0;color:var(--dsw-alias-label-secondary);font:inherit;font-size:10px;cursor:pointer;padding:2px 4px;border-radius:4px}
.dcb-olderBtn:hover{color:var(--dsw-alias-label-primary);background:var(--dsw-alias-bg-layer-2)}
.dcb-empty{padding:24px 12px;color:var(--dsw-alias-label-secondary);font-size:11px;text-align:center}
.dcb-error{margin:6px 12px;padding:6px 8px;border:1px solid var(--dsw-alias-state-error-primary);border-radius:6px;color:var(--dsw-alias-state-error-primary);font-size:11px}
.dcb-foot{border-top:1px solid var(--dsw-alias-border-l1);padding:8px 12px;display:flex;flex-direction:column;gap:5px}
.dcb-boundRow{display:flex;align-items:center;gap:6px;min-width:0}
.dcb-boundTitle{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-weight:600}
.dcb-hint{color:var(--dsw-alias-label-secondary);font-size:10.5px}
.dcb-linkBtn{background:none;border:0;padding:0;color:var(--dsw-alias-brand-primary);font:inherit;font-size:10.5px;cursor:pointer;text-align:left}
.dcb-linkBtn:hover{text-decoration:underline}
.dcb-spin{color:var(--dsw-alias-label-secondary);font-size:11px}
.dcb-detail{display:flex;flex-direction:column;height:100%;min-height:0}
.dcb-detailHead{display:flex;flex-direction:column;gap:5px;padding:8px 12px;border-bottom:1px solid var(--dsw-alias-border-l1)}
.dcb-detailTop{display:flex;align-items:center;gap:6px;min-width:0}
.dcb-back{border:0;background:none;color:var(--dsw-alias-label-secondary);cursor:pointer;font:inherit;font-size:14px;padding:0 2px;border-radius:4px}
.dcb-back:hover{color:var(--dsw-alias-label-primary);background:var(--dsw-alias-bg-layer-2)}
.dcb-detailTitle{flex:1;min-width:0;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dcb-detailSub{color:var(--dsw-alias-label-secondary);font-size:10.5px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dcb-detailActions{display:flex;align-items:center;gap:6px;flex-wrap:wrap}
.dcb-pill{border:1px solid var(--dsw-alias-brand-primary);color:var(--dsw-alias-brand-primary);border-radius:999px;padding:0 7px;font-size:9.5px;line-height:16px;white-space:nowrap}
.dcb-miniBtn{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-secondary);border-radius:5px;cursor:pointer;font:inherit;font-size:10px;padding:2px 7px;white-space:nowrap}
.dcb-miniBtn:hover{color:var(--dsw-alias-label-primary);border-color:var(--dsw-alias-label-secondary)}
.dcb-detailBody{flex:1;min-height:0;overflow-y:auto;padding:8px 10px 16px}
.dcb-section{margin-bottom:12px}
.dcb-sectionTitle{display:flex;align-items:center;gap:6px;font-size:11px;font-weight:600;color:var(--dsw-alias-label-secondary);margin:0 0 5px}
.dcb-sectionTitle .dcb-liveDot{margin-left:2px}
.dcb-info{display:grid;grid-template-columns:64px minmax(0,1fr);gap:3px 8px}
.dcb-infoKey{color:var(--dsw-alias-label-secondary);font-size:10.5px}
.dcb-infoVal{font-size:10.5px;word-break:break-all}
.dcb-liveDot{width:6px;height:6px;border-radius:50%;background:var(--dsw-alias-state-idle-primary);flex:none}
.dcb-liveDot[data-running="true"]{background:var(--dsw-alias-state-success-primary);animation:dcb-pulse 1.4s ease-in-out infinite}
.dcb-liveItem{display:grid;grid-template-columns:64px minmax(0,1fr);gap:6px;padding:4px 0;border-bottom:1px dashed var(--dsw-alias-border-l1)}
.dcb-liveType{font-size:9.5px;color:var(--dsw-alias-label-secondary);padding-top:1px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.dcb-liveText{font-size:10.5px;white-space:pre-wrap;word-break:break-word;max-height:110px;overflow:hidden}
.dcb-liveText[data-type="tool"]{font-family:ui-monospace,Consolas,monospace;font-size:10px;color:var(--dsw-alias-label-secondary)}
.dcb-liveText[data-type="reasoning"]{color:var(--dsw-alias-label-secondary);font-style:italic}
.dcb-liveText[data-type="event"]{color:var(--dsw-alias-brand-primary);font-size:10px}
.dcb-wsRow{display:flex;align-items:center;gap:6px;margin-bottom:4px}
.dcb-wsPath{flex:1;min-width:0;font-size:10px;color:var(--dsw-alias-label-secondary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;direction:rtl;text-align:left}
.dcb-fileRow{display:flex;align-items:center;gap:4px;width:100%;box-sizing:border-box;background:none;border:0;border-radius:4px;color:var(--dsw-alias-label-primary);font:inherit;font-size:10.5px;text-align:left;padding:2px 4px;cursor:pointer}
.dcb-fileRow:hover{background:var(--dsw-alias-bg-layer-2)}
.dcb-fileArrow{width:10px;flex:none;color:var(--dsw-alias-label-secondary);font-size:9px}
.dcb-fileName{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dcb-fileName[data-dir="true"]{font-weight:500}
.dcb-liveBox{height:auto}
.dcb-tabs{display:flex;gap:2px;padding:0 10px;border-bottom:1px solid var(--dsw-alias-border-l1);flex:none}
.dcb-tabBtn{box-sizing:border-box;background:none;border:0;border-bottom:2px solid transparent;color:var(--dsw-alias-label-secondary);font:inherit;font-size:10.5px;padding:6px 8px 5px;cursor:pointer;display:flex;align-items:center;gap:4px;transition:color .15s,border-color .15s}
.dcb-tabBtn:hover{color:var(--dsw-alias-label-primary)}
.dcb-tabBtn[data-active="true"]{color:var(--dsw-alias-label-primary);border-bottom-color:var(--dsw-alias-brand-primary)}
.dcb-tabCount{font-size:9px;color:var(--dsw-alias-label-secondary);background:var(--dsw-alias-bg-layer-2);border-radius:99px;padding:0 5px;line-height:13px;font-variant-numeric:tabular-nums}
.dcb-kpis{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px}
.dcb-kpi{border:1px solid var(--dsw-alias-border-l1);background:linear-gradient(180deg,var(--dsw-alias-bg-layer-1),var(--dsw-alias-bg-base));border-radius:9px;padding:7px 9px;display:flex;flex-direction:column;gap:1px;min-width:0;transition:border-color .15s,transform .15s}
.dcb-kpi:hover{border-color:var(--dsw-alias-border-l2);transform:translateY(-1px)}
.dcb-kpiLabel{font-size:9px;letter-spacing:.35px;text-transform:uppercase;color:var(--dsw-alias-label-secondary)}
.dcb-kpiValue{font-size:17px;font-weight:600;font-variant-numeric:tabular-nums;line-height:1.25;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.dcb-kpiSub{font-size:9px;color:var(--dsw-alias-label-secondary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.dcb-bar{height:4px;border-radius:99px;background:var(--dsw-alias-bg-layer-2);overflow:hidden;margin-top:4px}
.dcb-barFill{height:100%;border-radius:99px;background:var(--dsw-alias-state-success-primary);transition:width .6s cubic-bezier(.2,.7,.3,1)}
.dcb-chart{position:relative;border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-1);border-radius:9px;padding:8px 9px 6px;margin-top:6px;min-width:0}
.dcb-chartTitle{display:flex;align-items:center;gap:6px;font-size:10.5px;font-weight:600;margin-bottom:6px;min-width:0}
.dcb-chartHint{font-size:8.5px;color:var(--dsw-alias-label-secondary);font-weight:400;margin-left:auto;text-align:right;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.dcb-turnBars{display:flex;align-items:flex-end;gap:2px;height:78px;padding-top:4px}
.dcb-turnBar{position:relative;flex:1;min-width:2px;max-width:26px;height:100%;background:none;border:0;padding:0;cursor:pointer;display:flex;align-items:flex-end;border-radius:3px 3px 0 0}
.dcb-turnBar:hover{background:var(--dsw-alias-bg-layer-2)}
.dcb-turnBarFill{width:100%;border-radius:3px 3px 0 0;background:var(--dsw-alias-state-success-primary);opacity:.82;transition:height .4s cubic-bezier(.2,.7,.3,1),opacity .15s}
.dcb-turnBar[data-status="failed"] .dcb-turnBarFill{background:var(--dsw-alias-state-error-primary)}
.dcb-turnBar[data-status="interrupted"] .dcb-turnBarFill{background:var(--dsw-alias-state-warn-primary)}
.dcb-turnBar[data-status="running"] .dcb-turnBarFill{background:var(--dsw-alias-brand-primary);animation:dcb-pulse 1.4s ease-in-out infinite}
.dcb-turnBar[data-active="true"] .dcb-turnBarFill{opacity:1;box-shadow:0 0 0 1px var(--dsw-alias-label-primary) inset}
.dcb-turnAxis{display:flex;justify-content:space-between;font-size:8.5px;color:var(--dsw-alias-label-secondary);margin-top:3px;font-variant-numeric:tabular-nums}
.dcb-turnPick{display:flex;align-items:baseline;gap:6px;margin-top:5px;padding-top:5px;border-top:1px dashed var(--dsw-alias-border-l1);font-size:9.5px;color:var(--dsw-alias-label-secondary);min-width:0}
.dcb-turnPickTag{color:var(--dsw-alias-label-primary);font-weight:600;white-space:nowrap}
.dcb-turnPickText{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dcb-donutWrap{display:flex;gap:9px;align-items:center}
.dcb-donut{position:relative;flex:none;width:104px;height:104px}
.dcb-donutSvg{display:block;transform:rotate(-90deg)}
.dcb-donutSeg{transition:stroke-width .15s,opacity .15s;cursor:pointer}
.dcb-donutSeg:hover{stroke-width:18}
.dcb-donutCenter{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;pointer-events:none}
.dcb-donutValue{font-size:15px;font-weight:600;font-variant-numeric:tabular-nums;line-height:1.1}
.dcb-donutLabel{font-size:8.5px;color:var(--dsw-alias-label-secondary);max-width:72px;text-align:center;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dcb-legend{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px}
.dcb-legendRow{display:flex;align-items:center;gap:5px;font-size:9.5px;border-radius:3px;padding:1px 2px;min-width:0}
.dcb-legendRow[data-active="true"]{background:var(--dsw-alias-bg-layer-2)}
.dcb-legendDot{width:7px;height:7px;border-radius:2px;flex:none}
.dcb-legendName{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--dsw-alias-label-secondary)}
.dcb-legendVal{font-variant-numeric:tabular-nums;color:var(--dsw-alias-label-primary)}
.dcb-stack{display:flex;height:7px;border-radius:99px;overflow:hidden;background:var(--dsw-alias-bg-layer-2);margin:1px 0 5px}
.dcb-stackSeg{height:100%}
.dcb-stackLegend{display:flex;flex-wrap:wrap;gap:3px 10px;font-size:9px;color:var(--dsw-alias-label-secondary)}
.dcb-stackLegend b{color:var(--dsw-alias-label-primary);font-weight:600;font-variant-numeric:tabular-nums}
.dcb-spark{display:block;width:100%;height:52px}
.dcb-metricRows{display:flex;flex-direction:column;gap:4px}
.dcb-metricRow{display:flex;align-items:center;gap:6px;font-size:9.5px;min-width:0}
.dcb-metricName{width:70px;flex:none;color:var(--dsw-alias-label-secondary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dcb-metricTrack{flex:1;height:5px;border-radius:99px;background:var(--dsw-alias-bg-layer-2);overflow:hidden}
.dcb-metricFill{height:100%;border-radius:99px;background:var(--dsw-alias-brand-primary);transition:width .5s cubic-bezier(.2,.7,.3,1)}
.dcb-metricVal{width:78px;text-align:right;font-variant-numeric:tabular-nums;flex:none;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.dcb-fileStat{display:flex;flex-direction:column;gap:1px}
.dcb-fileStatRow{display:flex;align-items:center;gap:5px;font-size:9.5px;padding:2px 3px;border-radius:4px;background:none;border:0;color:inherit;font-family:inherit;text-align:left;cursor:pointer;min-width:0}
.dcb-fileStatRow:hover{background:var(--dsw-alias-bg-layer-2)}
.dcb-fileStatPath{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;direction:rtl;text-align:left;font-family:ui-monospace,Consolas,monospace;font-size:9px}
.dcb-fileStatCount{flex:none;font-size:8.5px;color:var(--dsw-alias-label-secondary);font-variant-numeric:tabular-nums}
.dcb-kindBadge{flex:none;font-size:8px;line-height:12px;padding:0 3px;border-radius:3px;border:1px solid var(--dsw-alias-border-l2);color:var(--dsw-alias-label-secondary)}
.dcb-kindBadge[data-kind="add"]{color:var(--dsw-alias-state-success-primary)}
.dcb-kindBadge[data-kind="delete"]{color:var(--dsw-alias-state-error-primary)}
.dcb-kindBadge[data-kind="update"]{color:var(--dsw-alias-brand-primary)}
.dcb-firstUser{font-size:10px;color:var(--dsw-alias-label-secondary);white-space:pre-wrap;word-break:break-word;border-left:2px solid var(--dsw-alias-border-l2);padding:2px 0 2px 7px;max-height:84px;overflow:hidden;line-height:1.5;cursor:pointer}
.dcb-firstUser[data-open="true"]{max-height:none}
.dcb-statsHint{font-size:8.5px;color:var(--dsw-alias-label-secondary);margin-top:5px;text-align:center}
@keyframes dcb-pulse{0%,100%{opacity:1}50%{opacity:.35}}
@media (prefers-reduced-motion:reduce){.dcb-dot[data-status="running"],.dcb-liveDot[data-running="true"]{animation:none}}
`

    function ensureStyle() {
      if (typeof document === 'undefined') return
      const selector = 'style[data-plugin-css="dsh-codex-bridge/tab"]'
      if (document.querySelector(selector) !== null) return
      const style = document.createElement('style')
      style.dataset.plugin = '@local/dsh-codex-bridge'
      style.dataset.pluginCss = 'dsh-codex-bridge/tab'
      style.textContent = CSS
      document.head.appendChild(style)
    }

    async function post(path, body) {
      const response = await fetch(`api/dsh-codex-bridge/${path}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body ?? {}),
      })
      let data = null
      try {
        data = await response.json()
      } catch {}
      if (!data || data.ok !== true) {
        const message = data?.error?.message || `HTTP ${response.status}`
        throw new Error(message)
      }
      return data.value
    }

    function errorText(cause) {
      return cause instanceof Error ? cause.message : String(cause)
    }

    function agoLabel(ms, now) {
      if (!ms) return ''
      const diff = Math.max(0, now - ms)
      if (diff < 60_000) return 'just now'
      if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m`
      if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h`
      return `${Math.floor(diff / 86_400_000)}d`
    }

    function statusLabel(t, status) {
      const key = status === 'running' ? 'working' : status
      return t(`ui.${key}`)
    }

    function matches(thread, needle) {
      if (!needle) return true
      const haystack = `${thread.title} ${thread.preview} ${thread.cwd} ${thread.projectName ?? ''}`.toLowerCase()
      return haystack.includes(needle)
    }

    function clock(ms) {
      if (!ms) return ''
      try {
        return new Date(ms).toLocaleTimeString('zh-CN', { hour12: false })
      } catch {
        return ''
      }
    }

    function joinPath(base, name) {
      if (!base) return name
      return /[\\/]$/.test(base) ? `${base}${name}` : `${base}\\${name}`
    }

    function fmtNumber(value) {
      try {
        return Number(value).toLocaleString('en-US')
      } catch {
        return String(value ?? '')
      }
    }

    function fmtDuration(ms) {
      const value = Number(ms) || 0
      if (value < 1000) return `${value}ms`
      const total = Math.round(value / 1000)
      if (total < 60) return `${total}s`
      const minutes = Math.floor(total / 60)
      const seconds = total % 60
      if (minutes < 60) return seconds ? `${minutes}m${seconds}s` : `${minutes}m`
      const hours = Math.floor(minutes / 60)
      return `${hours}h${minutes % 60}m`
    }

    function pct(value) {
      const number = Number(value) || 0
      return `${Math.round(number * 100)}%`
    }

    function ThreadRow({ thread, bound, now, t, onBind, onOpen, busy }) {
      const meta = [agoLabel(thread.updatedAt, now), `${thread.turnCount || 0} ${t('ui.turns')}`]
      if (thread.cwd) meta.push(thread.cwd)
      const kindClass = thread.kind === 'side' ? ' dcb-threadSide' : thread.kind === 'subagent' ? ' dcb-threadSubagent' : ''
      const badge = thread.kind === 'side' ? t('ui.side') : thread.kind === 'subagent' ? t('ui.subagent') : null
      const tooltip = [
        thread.title,
        thread.cwd || '',
        thread.kind === 'side' && thread.parentTitle ? `${t('ui.sideOf')}: ${thread.parentTitle}` : '',
        t('ui.doubleClick'),
      ].filter(Boolean).join('\n')
      return h(
        'button',
        {
          type: 'button',
          className: `dcb-thread${kindClass}${bound ? ' dcb-threadBound' : ''}`,
          title: tooltip,
          disabled: busy,
          onClick: () => onBind(thread),
          onDoubleClick: (event) => {
            event.preventDefault()
            onOpen(thread)
          },
        },
        h('span', { className: 'dcb-dot', 'data-status': thread.status || 'idle' }),
        h(
          'span',
          { className: 'dcb-threadTitle' },
          badge ? h('span', { className: 'dcb-badge' }, badge) : null,
          thread.title,
        ),
        h('span', { className: 'dcb-threadMeta' }, meta.join(' · ')),
      )
    }

    function liveTypeLabel(t, item) {
      if (item.type === 'reasoning') return t('ui.think')
      if (item.type === 'assistant') return 'Codex'
      if (item.type === 'user') return t('ui.you')
      if (item.type === 'event') return t('ui.event')
      return item.name || t('ui.tool')
    }

    function liveText(t, item) {
      if (item.type === 'event') return item.name === 'task_started' ? t('ui.started') : t('ui.finished')
      return item.text || ''
    }

    function LiveItem({ item, t }) {
      const at = clock(item.ts)
      return h(
        'div',
        { className: 'dcb-liveItem' },
        h('span', { className: 'dcb-liveType' }, [at, liveTypeLabel(t, item)].filter(Boolean).join(' ')),
        h('div', { className: 'dcb-liveText', 'data-type': item.type || 'tool' }, liveText(t, item)),
      )
    }

    const TYPE_COLORS = {
      reasoning: 'var(--dsw-alias-brand-primary)',
      commands: 'var(--dsw-alias-label-secondary)',
      assistant: 'color-mix(in srgb, var(--dsw-alias-brand-primary) 62%, var(--dsw-alias-label-primary))',
      user: 'var(--dsw-alias-state-warn-primary)',
      files: 'var(--dsw-alias-state-error-primary)',
      other: 'var(--dsw-alias-border-l2)',
    }

    function KpiCard({ label, value, sub, fill }) {
      return h(
        'div',
        { className: 'dcb-kpi' },
        h('span', { className: 'dcb-kpiLabel' }, label),
        h('span', { className: 'dcb-kpiValue' }, value),
        sub ? h('span', { className: 'dcb-kpiSub', title: sub }, sub) : null,
        typeof fill === 'number'
          ? h('div', { className: 'dcb-bar' }, h('div', { className: 'dcb-barFill', style: { width: `${Math.round(fill * 100)}%` } }))
          : null,
      )
    }

    function TurnChart({ turns, t, picked, onPick }) {
      if (!turns.length) return h('div', { className: 'dcb-chart' }, h('div', { className: 'dcb-chartTitle' }, t('ui.durationChart')), h('div', { className: 'dcb-hint' }, t('ui.noStats')))
      const max = Math.max(1, ...turns.map((turn) => turn.durationMs || 0))
      const selected = turns.find((turn) => turn.turnId === picked) || null
      return h(
        'div',
        { className: 'dcb-chart' },
        h('div', { className: 'dcb-chartTitle' }, h('span', null, t('ui.durationChart')), h('span', { className: 'dcb-chartHint' }, t('ui.durationHint'))),
        h(
          'div',
          { className: 'dcb-turnBars' },
          turns.map((turn) =>
            h(
              'button',
              {
                key: turn.turnId,
                type: 'button',
                className: 'dcb-turnBar',
                'data-status': turn.status,
                'data-active': picked === turn.turnId ? 'true' : 'false',
                title: `#${turn.ordinal} · ${statusLabel(t, turn.status)} · ${turn.durationMs ? fmtDuration(turn.durationMs) : '—'}\n${clock(turn.startedAt)}`,
                onClick: () => onPick(picked === turn.turnId ? null : turn.turnId),
              },
              h('span', {
                className: 'dcb-turnBarFill',
                style: { height: `${turn.durationMs ? Math.max(3, Math.round((turn.durationMs / max) * 100)) : turn.status === 'running' ? 22 : 8}%` },
              }),
            ),
          ),
        ),
        turns.length > 1
          ? h('div', { className: 'dcb-turnAxis' }, h('span', null, `#${turns[0].ordinal}`), h('span', null, `#${turns[turns.length - 1].ordinal}`))
          : null,
        h(
          'div',
          { className: 'dcb-turnPick' },
          h('span', { className: 'dcb-turnPickTag' }, selected ? `#${selected.ordinal}` : t('ui.pickTurn')),
          h(
            'span',
            { className: 'dcb-turnPickText' },
            selected
              ? `${statusLabel(t, selected.status)} · ${selected.durationMs ? fmtDuration(selected.durationMs) : '—'} · ${fmtNumber(selected.itemCount)} ${t('ui.itemsUnit')} · ${clock(selected.startedAt)}`
              : t('ui.durationHint'),
          ),
        ),
      )
    }

    function CompositionChart({ items, t }) {
      const [active, setActive] = React.useState(null)
      const total = items.reduce((sum, item) => sum + item.value, 0)
      if (!total) return h('div', { className: 'dcb-hint' }, t('ui.noStats'))
      const radius = 42
      const circumference = 2 * Math.PI * radius
      const segments = []
      let cursor = 0
      for (const item of items) {
        if (!(item.value > 0)) continue
        const length = (item.value / total) * circumference
        segments.push({ ...item, length, offset: cursor })
        cursor += length
      }
      const act = segments.find((item) => item.key === active) || null
      return h(
        'div',
        { className: 'dcb-donutWrap' },
        h(
          'div',
          { className: 'dcb-donut' },
          h(
            'svg',
            { className: 'dcb-donutSvg', width: 104, height: 104, viewBox: '0 0 104 104' },
            h('circle', { cx: 52, cy: 52, r: radius, fill: 'none', stroke: 'var(--dsw-alias-bg-layer-2)', strokeWidth: 13 }),
            segments.map((segment) =>
              h('circle', {
                key: segment.key,
                cx: 52,
                cy: 52,
                r: radius,
                fill: 'none',
                stroke: segment.color,
                strokeWidth: act && act.key === segment.key ? 17 : 13,
                strokeDasharray: `${Math.max(0, segment.length - 1.5)} ${circumference}`,
                strokeDashoffset: -segment.offset,
                className: 'dcb-donutSeg',
                onMouseEnter: () => setActive(segment.key),
                onMouseLeave: () => setActive(null),
              }),
            ),
          ),
          h(
            'div',
            { className: 'dcb-donutCenter' },
            h('span', { className: 'dcb-donutValue' }, fmtNumber(act ? act.value : total)),
            h('span', { className: 'dcb-donutLabel' }, act ? act.label : t('ui.itemsUnit')),
          ),
        ),
        h(
          'div',
          { className: 'dcb-legend' },
          items.map((item) =>
            h(
              'div',
              {
                key: item.key,
                className: 'dcb-legendRow',
                'data-active': active === item.key ? 'true' : 'false',
                onMouseEnter: () => setActive(item.key),
                onMouseLeave: () => setActive(null),
              },
              h('span', { className: 'dcb-legendDot', style: { background: item.color } }),
              h('span', { className: 'dcb-legendName' }, item.label),
              h('span', { className: 'dcb-legendVal' }, fmtNumber(item.value)),
            ),
          ),
        ),
      )
    }

    function StatusStack({ turns, t }) {
      const total = turns.total || 0
      if (!total) return h('div', { className: 'dcb-hint' }, t('ui.noStats'))
      const rows = [
        ['completed', t('ui.success'), turns.completed, 'var(--dsw-alias-state-success-primary)'],
        ['failed', t('ui.failedTurn'), turns.failed, 'var(--dsw-alias-state-error-primary)'],
        ['interrupted', t('ui.interruptedTurn'), turns.interrupted, 'var(--dsw-alias-state-warn-primary)'],
        ['running', t('ui.runningTurn'), turns.running, 'var(--dsw-alias-brand-primary)'],
      ].filter((row) => row[2] > 0)
      return h(
        'div',
        null,
        h(
          'div',
          { className: 'dcb-stack' },
          rows.map(([key, label, count, color]) =>
            h('span', { key, className: 'dcb-stackSeg', style: { width: `${(count / total) * 100}%`, background: color }, title: `${label}: ${count}` }),
          ),
        ),
        h('div', { className: 'dcb-stackLegend' }, rows.map(([key, label, count]) => h('span', { key }, `${label} `, h('b', null, fmtNumber(count))))),
      )
    }

    function Sparkline({ values }) {
      if (!values.length) return null
      const width = 260
      const height = 46
      const pad = 3
      const max = Math.max(1, ...values)
      const step = values.length > 1 ? (width - pad * 2) / (values.length - 1) : 0
      const points = values.map((value, index) => [pad + index * step, height - pad - (value / max) * (height - pad * 2)])
      const line = points.map((point) => `${point[0].toFixed(1)},${point[1].toFixed(1)}`).join(' ')
      const area = `${pad},${height} ${line} ${(pad + (values.length - 1) * step).toFixed(1)},${height}`
      return h(
        'svg',
        { className: 'dcb-spark', viewBox: `0 0 ${width} ${height}`, preserveAspectRatio: 'none' },
        h('polygon', { points: area, fill: 'var(--dsw-alias-brand-primary)', opacity: 0.12 }),
        h('polyline', { points: line, fill: 'none', stroke: 'var(--dsw-alias-brand-primary)', strokeWidth: 1.6, vectorEffect: 'non-scaling-stroke' }),
        points.map((point, index) =>
          h('circle', { key: index, cx: point[0].toFixed(1), cy: point[1].toFixed(1), r: 1.7, fill: 'var(--dsw-alias-brand-primary)' }),
        ),
      )
    }

    function MetricRows({ rows }) {
      const max = Math.max(1, ...rows.map((row) => row.value))
      return h(
        'div',
        { className: 'dcb-metricRows' },
        rows.map((row) =>
          h(
            'div',
            { key: row.name, className: 'dcb-metricRow' },
            h('span', { className: 'dcb-metricName', title: row.name }, row.name),
            h('div', { className: 'dcb-metricTrack' }, h('div', { className: 'dcb-metricFill', style: { width: `${Math.round((row.value / max) * 100)}%` } })),
            h('span', { className: 'dcb-metricVal', title: row.display || String(row.value) }, row.display || fmtNumber(row.value)),
          ),
        ),
      )
    }

    function FileTop({ files, t, onReveal }) {
      if (!files.length) return h('div', { className: 'dcb-hint' }, t('ui.noStats'))
      return h(
        'div',
        { className: 'dcb-fileStat' },
        files.map((file) => {
          const kind = (file.kinds || [])[0] || 'update'
          return h(
            'button',
            { key: file.path, type: 'button', className: 'dcb-fileStatRow', title: `${file.path}\n${t('ui.reveal')}`, onClick: () => onReveal(file.path) },
            h('span', { className: 'dcb-kindBadge', 'data-kind': kind }, t(`ui.${kind === 'other' ? 'other' : kind}`)),
            h('span', { className: 'dcb-fileStatPath' }, file.path),
            h('span', { className: 'dcb-fileStatCount' }, `${fmtNumber(file.count)} ${t('ui.filesUnit')}`),
          )
        }),
      )
    }

    function StatsOverview({ stats, t, onReveal }) {
      const [picked, setPicked] = React.useState(null)
      const [openFirst, setOpenFirst] = React.useState(false)
      const duration = stats.turns.durationsMs
      const otherItems = Math.max(
        0,
        stats.items.total - stats.items.reasoning - stats.items.commands - stats.items.assistantMessages - stats.items.userMessages - stats.items.fileChanges,
      )
      const items = [
        { key: 'reasoning', label: t('ui.reasoning'), value: stats.items.reasoning, color: TYPE_COLORS.reasoning },
        { key: 'commands', label: t('ui.commands'), value: stats.items.commands, color: TYPE_COLORS.commands },
        { key: 'assistant', label: t('ui.assistantMsg'), value: stats.items.assistantMessages, color: TYPE_COLORS.assistant },
        { key: 'user', label: t('ui.userMsg'), value: stats.items.userMessages, color: TYPE_COLORS.user },
        { key: 'files', label: t('ui.fileChanges'), value: stats.items.fileChanges, color: TYPE_COLORS.files },
        { key: 'other', label: t('ui.otherItems'), value: otherItems, color: TYPE_COLORS.other },
      ]
      const tools = [
        {
          name: t('ui.commands'),
          value: stats.items.commands,
          display: `${fmtNumber(stats.items.commands)}${stats.items.commandFailures ? ` · ${stats.items.commandFailures} ${t('ui.commandFailed')}` : ''}`,
        },
        { name: t('ui.mcpCalls'), value: stats.items.mcpCalls, display: fmtNumber(stats.items.mcpCalls) },
        { name: t('ui.webSearches'), value: stats.items.webSearches, display: fmtNumber(stats.items.webSearches) },
        { name: t('ui.subagents'), value: stats.items.subagentCalls, display: fmtNumber(stats.items.subagentCalls) },
        { name: t('ui.fileChanges'), value: stats.items.fileChanges, display: fmtNumber(stats.items.fileChanges) },
      ]
      return h(
        'div',
        null,
        h(
          'div',
          { className: 'dcb-kpis' },
          h(KpiCard, {
            label: t('ui.kpiTurns'),
            value: fmtNumber(stats.turns.total),
            sub: `${t('ui.success')} ${fmtNumber(stats.turns.completed)} · ${t('ui.failedTurn')} ${fmtNumber(stats.turns.failed)}`,
          }),
          h(KpiCard, { label: t('ui.kpiSuccess'), value: pct(stats.turns.successRate), fill: stats.turns.successRate, sub: `${stats.turns.completed}/${stats.turns.total}` }),
          h(KpiCard, {
            label: t('ui.kpiAvg'),
            value: duration.avg == null ? '—' : fmtDuration(duration.avg),
            sub: duration.median == null ? null : `${t('ui.median')} ${fmtDuration(duration.median)}`,
          }),
          h(KpiCard, {
            label: t('ui.p95'),
            value: duration.p95 == null ? '—' : fmtDuration(duration.p95),
            sub: duration.longest == null ? null : `${t('ui.longest')} ${fmtDuration(duration.longest)}`,
          }),
          h(KpiCard, {
            label: t('ui.kpiFiles'),
            value: fmtNumber(stats.files.touched),
            sub: `${t('ui.add')} ${stats.files.byKind.add} · ${t('ui.update')} ${stats.files.byKind.update} · ${t('ui.delete')} ${stats.files.byKind.delete}`,
          }),
          h(KpiCard, { label: t('ui.kpiTokens'), value: fmtNumber(stats.thread.tokensUsed || 0), sub: `${fmtNumber(stats.items.total)} ${t('ui.itemsUnit')}` }),
        ),
        h(TurnChart, { turns: stats.recentTurns, t, picked, onPick: setPicked }),
        h('div', { className: 'dcb-chart' }, h('div', { className: 'dcb-chartTitle' }, h('span', null, t('ui.composition'))), h(CompositionChart, { items, t })),
        h(
          'div',
          { className: 'dcb-chart' },
          h('div', { className: 'dcb-chartTitle' }, h('span', null, t('ui.statusMix')), h('span', { className: 'dcb-chartHint' }, `${stats.turns.total} ${t('ui.turnWord')}`)),
          h(StatusStack, { turns: stats.turns, t }),
        ),
        h(
          'div',
          { className: 'dcb-chart' },
          h('div', { className: 'dcb-chartTitle' }, h('span', null, t('ui.activityCurve')), h('span', { className: 'dcb-chartHint' }, `${stats.recentTurns.length} ${t('ui.turnWord')}`)),
          h(Sparkline, { values: stats.recentTurns.map((turn) => turn.itemCount) }),
        ),
        h('div', { className: 'dcb-chart' }, h('div', { className: 'dcb-chartTitle' }, h('span', null, t('ui.toolsTitle'))), h(MetricRows, { rows: tools })),
        stats.files.top.length
          ? h(
              'div',
              { className: 'dcb-chart' },
              h('div', { className: 'dcb-chartTitle' }, h('span', null, t('ui.filesTop'))),
              h(FileTop, { files: stats.files.top, t, onReveal }),
            )
          : null,
        stats.firstUser
          ? h(
              'div',
              { className: 'dcb-chart' },
              h('div', { className: 'dcb-chartTitle' }, h('span', null, t('ui.firstUser'))),
              h(
                'div',
                { className: 'dcb-firstUser', 'data-open': openFirst ? 'true' : 'false', title: stats.firstUser, onClick: () => setOpenFirst((value) => !value) },
                stats.firstUser,
              ),
            )
          : null,
        h('div', { className: 'dcb-statsHint' }, t('ui.statsHint')),
      )
    }

    function ThreadDetail({ threadId, initialThread, t, boundThreadId, onBack, onBind, onUnbind }) {
      const [live, setLive] = React.useState(null)
      const [stats, setStats] = React.useState(null)
      const [tab, setTab] = React.useState('overview')
      const [error, setError] = React.useState(null)
      const [root, setRoot] = React.useState(null)
      const [rootEntries, setRootEntries] = React.useState(null)
      const [dirs, setDirs] = React.useState({})
      const [open, setOpen] = React.useState({})
      const [loadingDir, setLoadingDir] = React.useState(null)
      const [busy, setBusy] = React.useState(false)
      const liveRef = React.useRef(null)
      const autoLive = React.useRef(false)

      const thread = live?.thread || initialThread || { id: threadId, title: 'Codex thread' }
      const bound = boundThreadId === threadId

      React.useEffect(() => {
        let cancelled = false
        let timer = null
        const tick = async () => {
          try {
            const value = await post('live', { threadId })
            if (cancelled) return
            setLive(value)
            setError(null)
            timer = setTimeout(tick, value.running ? LIVE_MS : POLL_MS)
          } catch (cause) {
            if (cancelled) return
            setError(errorText(cause))
            timer = setTimeout(tick, POLL_MS)
          }
        }
        tick()
        return () => {
          cancelled = true
          if (timer) clearTimeout(timer)
        }
      }, [threadId])

      React.useEffect(() => {
        let cancelled = false
        ;(async () => {
          try {
            const value = await post('tree', { threadId })
            if (cancelled) return
            setRoot(value.root)
            setRootEntries(value.entries)
            setDirs((current) => ({ ...current, [value.dir]: value.entries }))
          } catch (cause) {
            if (!cancelled) setError(errorText(cause))
          }
        })()
        return () => {
          cancelled = true
        }
      }, [threadId])

      React.useEffect(() => {
        let cancelled = false
        let timer = null
        const load = async () => {
          try {
            const value = await post('stats', { threadId })
            if (cancelled) return
            setStats(value)
          } catch (cause) {
            if (!cancelled) setError(errorText(cause))
          }
          if (!cancelled) timer = setTimeout(load, 20000)
        }
        load()
        return () => {
          cancelled = true
          if (timer) clearTimeout(timer)
        }
      }, [threadId])

      React.useEffect(() => {
        if (!live?.running || autoLive.current) return
        autoLive.current = true
        setTab('live')
      }, [live])

      React.useEffect(() => {
        if (!live?.running || !liveRef.current) return
        liveRef.current.scrollTop = liveRef.current.scrollHeight
      }, [live])

      const reveal = async (target, select) => {
        try {
          await post('reveal', { threadId, path: target, select: Boolean(select) })
        } catch (cause) {
          setError(errorText(cause))
        }
      }

      const toggleDir = async (full) => {
        const isOpen = open[full] === true
        setOpen((current) => ({ ...current, [full]: !isOpen }))
        if (isOpen || dirs[full]) return
        setLoadingDir(full)
        try {
          const value = await post('tree', { threadId, dir: full })
          setDirs((current) => ({ ...current, [full]: value.entries }))
        } catch (cause) {
          setError(errorText(cause))
        } finally {
          setLoadingDir(null)
        }
      }

      const bind = async () => {
        setBusy(true)
        try {
          await onBind({ id: threadId, title: thread.title, cwd: thread.cwd })
        } catch (cause) {
          setError(errorText(cause))
        } finally {
          setBusy(false)
        }
      }

      const renderEntries = (base, entries, depth) =>
        entries.map((entry) => {
          const full = joinPath(base, entry.name)
          const isOpen = open[full] === true
          const children = dirs[full]
          return h(
            React.Fragment,
            { key: full },
            h(
              'button',
              {
                type: 'button',
                className: 'dcb-fileRow',
                style: { paddingLeft: 4 + depth * 12 },
                title: entry.dir ? full : `${full}\n${t('ui.reveal')}`,
                onClick: () => (entry.dir ? toggleDir(full) : reveal(full, true)),
              },
              h('span', { className: 'dcb-fileArrow' }, entry.dir ? (isOpen ? '▾' : '▸') : '·'),
              h('span', { className: 'dcb-fileName', 'data-dir': entry.dir ? 'true' : 'false' }, entry.name),
            ),
            entry.dir && isOpen
              ? children
                ? renderEntries(full, children, depth + 1)
                : h(
                    'div',
                    { className: 'dcb-hint', style: { paddingLeft: 22 + depth * 12 } },
                    loadingDir === full ? t('ui.loadingDir') : t('ui.emptyDir'),
                  )
              : null,
          )
        })

      const status = live?.running ? 'running' : thread.status || 'idle'
      const info = []
      info.push([t('ui.status'), statusLabel(t, status)])
      if (thread.model) info.push([t('ui.model'), thread.model])
      info.push([t('ui.turnsLabel'), String(thread.turnCount ?? 0)])
      if (thread.branch) info.push([t('ui.branch'), `${thread.branch}${thread.gitSha ? ` @ ${String(thread.gitSha).slice(0, 7)}` : ''}`])
      if (thread.tokensUsed) info.push([t('ui.tokens'), fmtNumber(thread.tokensUsed)])
      if (thread.createdAt) info.push([t('ui.created'), `${agoLabel(thread.createdAt, Date.now())} · ${thread.createdAtIso || ''}`])
      if (thread.updatedAt) info.push([t('ui.updated'), `${agoLabel(thread.updatedAt, Date.now())} · ${thread.updatedAtIso || ''}`])
      info.push([t('ui.threadId'), threadId])
      if (thread.kind === 'side') info.push([t('ui.kind'), `${t('ui.side')}${thread.parentTitle ? ` · ${thread.parentTitle}` : ''}`])
      if (thread.kind === 'subagent') info.push([t('ui.kind'), t('ui.subagent')])

      const items = live?.items ?? []
      const headTitle = thread.title || threadId

      return h(
        'div',
        { className: 'dcb-detail' },
        h(
          'div',
          { className: 'dcb-detailHead' },
          h(
            'div',
            { className: 'dcb-detailTop' },
            h('button', { type: 'button', className: 'dcb-back', onClick: onBack, title: t('ui.back') }, '←'),
            h('span', { className: 'dcb-detailTitle', title: headTitle }, headTitle),
            h('span', { className: 'dcb-dot', 'data-status': status, style: { marginTop: 0 } }),
          ),
          h(
            'div',
            { className: 'dcb-detailSub', title: thread.cwd || '', onClick: () => thread.cwd && reveal(thread.cwd, false), style: thread.cwd ? { cursor: 'pointer' } : null },
            thread.cwd || t('ui.noWorkspace'),
          ),
          h(
            'div',
            { className: 'dcb-detailActions' },
            bound
              ? h('span', { className: 'dcb-pill' }, t('ui.boundPill'))
              : h('button', { type: 'button', className: 'dcb-miniBtn', disabled: busy, onClick: bind }, t('ui.bindToSession')),
            bound ? h('button', { type: 'button', className: 'dcb-miniBtn', onClick: onUnbind }, t('ui.unbind')) : null,
            h('button', { type: 'button', className: 'dcb-miniBtn', onClick: () => thread.cwd && reveal(thread.cwd, false) }, t('ui.openWorkspace')),
          ),
        ),
        error ? h('div', { className: 'dcb-error' }, error) : null,
        h(
          'div',
          { className: 'dcb-tabs' },
          [
            ['overview', t('ui.overviewTab'), null],
            ['live', t('ui.liveTab'), live?.running ? 'running' : items.length || null],
            ['files', t('ui.filesTab'), rootEntries?.length || null],
          ].map(([key, label, count]) =>
            h(
              'button',
              { key, type: 'button', className: 'dcb-tabBtn', 'data-active': tab === key ? 'true' : 'false', onClick: () => setTab(key) },
              label,
              count != null && count !== '' ? h('span', { className: 'dcb-tabCount' }, typeof count === 'number' ? fmtNumber(count) : '●') : null,
            ),
          ),
        ),
        h(
          'div',
          { className: 'dcb-detailBody' },
          tab === 'overview'
            ? h(
                React.Fragment,
                null,
                h(
                  'div',
                  { className: 'dcb-section' },
                  stats
                    ? h(StatsOverview, { stats, t, onReveal: (target) => reveal(target, true) })
                    : h('div', { className: 'dcb-hint' }, t('ui.loadingDir')),
                ),
                h(
                  'div',
                  { className: 'dcb-section' },
                  h('div', { className: 'dcb-sectionTitle' }, t('ui.info')),
                  h(
                    'div',
                    { className: 'dcb-info' },
                    info.map(([key, value]) =>
                      h(React.Fragment, { key }, h('div', { className: 'dcb-infoKey' }, key), h('div', { className: 'dcb-infoVal' }, value)),
                    ),
                  ),
                ),
              )
            : null,
          tab === 'live'
            ? h(
                'div',
                { className: 'dcb-section' },
                h(
                  'div',
                  { className: 'dcb-sectionTitle' },
                  h('span', null, t('ui.liveTitle')),
                  h('span', { className: 'dcb-liveDot', 'data-running': live?.running ? 'true' : 'false' }),
                  h('span', { className: 'dcb-hint' }, statusLabel(t, status)),
                ),
                h(
                  'div',
                  { className: 'dcb-liveBox', ref: liveRef, style: { maxHeight: 420, overflowY: 'auto' } },
                  items.length ? items.map((item) => h(LiveItem, { key: item.id, item, t })) : h('div', { className: 'dcb-hint' }, t('ui.noLive')),
                ),
                h('div', { className: 'dcb-hint', style: { marginTop: 3 } }, t('ui.liveHint')),
              )
            : null,
          tab === 'files'
            ? h(
                'div',
                { className: 'dcb-section' },
                h(
                  'div',
                  { className: 'dcb-sectionTitle' },
                  h('span', null, t('ui.filesTitle')),
                  h('button', { type: 'button', className: 'dcb-miniBtn', style: { marginLeft: 'auto' }, onClick: () => root && reveal(root, false) }, t('ui.open')),
                ),
                h('div', { className: 'dcb-wsRow' }, h('span', { className: 'dcb-wsPath', title: root || thread.cwd || '' }, root || thread.cwd || '')),
                rootEntries
                  ? rootEntries.length
                    ? renderEntries(root || thread.cwd || '', rootEntries, 0)
                    : h('div', { className: 'dcb-hint' }, t('ui.emptyDir'))
                  : h('div', { className: 'dcb-hint' }, t('ui.loadingDir')),
              )
            : null,
        ),
      )
    }

    function CodexTab(props) {
      const t = props.t || ((key) => key)
      const sessionId = props.sessionId
      const [roster, setRoster] = React.useState(null)
      const [binding, setBinding] = React.useState(null)
      const [error, setError] = React.useState(null)
      const [query, setQuery] = React.useState('')
      const [showAll, setShowAll] = React.useState(false)
      const [hideSide, setHideSide] = React.useState(false)
      const [collapsed, setCollapsed] = React.useState({})
      const [olderOpen, setOlderOpen] = React.useState({})
      const [busyId, setBusyId] = React.useState(null)
      const [detailId, setDetailId] = React.useState(null)

      React.useEffect(() => {
        ensureStyle()
      }, [])

      const loadRoster = React.useCallback(async () => {
        if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return
        try {
          const value = await post('roster')
          setRoster(value)
          setError(null)
        } catch (cause) {
          setError(errorText(cause))
        }
      }, [])

      const loadBinding = React.useCallback(async () => {
        if (!sessionId) return
        try {
          const value = await post('binding', { sessionId })
          setBinding(value)
        } catch (cause) {
          setError(errorText(cause))
        }
      }, [sessionId])

      React.useEffect(() => {
        let cancelled = false
        const tick = () => {
          if (cancelled) return
          loadRoster()
        }
        tick()
        loadBinding()
        const timer = setInterval(tick, POLL_MS)
        return () => {
          cancelled = true
          clearInterval(timer)
        }
      }, [loadRoster, loadBinding])

      const bind = React.useCallback(
        async (thread) => {
          if (!sessionId) return
          setBusyId(thread.id)
          try {
            const value = await post('bind', { sessionId, threadId: thread.id })
            setBinding(value)
            setError(null)
          } catch (cause) {
            setError(errorText(cause))
          } finally {
            setBusyId(null)
          }
        },
        [sessionId],
      )

      const unbind = React.useCallback(async () => {
        if (!sessionId) return
        try {
          await post('unbind', { sessionId })
          setBinding(null)
        } catch (cause) {
          setError(errorText(cause))
        }
      }, [sessionId])

      const openDetail = React.useCallback((thread) => {
        // A double-click always fires the list's click handler first, so the
        // bind request is already on its way; only switch the view here.
        setDetailId(thread.id)
      }, [])

      const now = Date.now()
      const boundId = binding?.binding?.threadId ?? null
      const needle = query.trim().toLowerCase()
      const cutoff = roster?.recentCutoff ?? 0
      const groups = (roster?.projects ?? [])
        .map((group) => {
          const threads = (group.threads ?? [])
            .filter((thread) => !hideSide || thread.kind === 'main')
            .filter((thread) => matches(thread, needle))
          const recent = threads.filter((thread) => (thread.updatedAt ?? 0) >= cutoff)
          const older = threads.filter((thread) => (thread.updatedAt ?? 0) < cutoff)
          return { group, recent, older, total: threads.length }
        })
        .filter((entry) => entry.total > 0)
        .filter((entry) => showAll || entry.recent.length > 0 || entry.group.threads.some((thread) => thread.id === boundId))

      const allThreads = (roster?.projects ?? []).flatMap((group) => group.threads)
      const boundThread = boundId ? allThreads.find((thread) => thread.id === boundId) ?? binding?.thread ?? null : null

      const toggleGroup = (groupId) => setCollapsed((current) => ({ ...current, [groupId]: !current[groupId] }))
      const toggleOlder = (groupId) => setOlderOpen((current) => ({ ...current, [groupId]: !current[groupId] }))

      if (detailId) {
        const initial = allThreads.find((thread) => thread.id === detailId) ?? binding?.thread ?? null
        return h(ThreadDetail, {
          threadId: detailId,
          initialThread: initial,
          t,
          boundThreadId: boundId,
          onBack: () => setDetailId(null),
          onBind: bind,
          onUnbind: unbind,
        })
      }

      const boundKind = boundThread?.kind === 'side' ? ` · ${t('ui.side')}` : boundThread?.kind === 'subagent' ? ` · ${t('ui.subagent')}` : ''
      const headerSub = boundThread ? `${t('ui.boundTo')}: ${boundThread.title}${boundKind}` : t('ui.notBound')

      return h(
        'div',
        { className: 'dcb-root' },
        h(
          'div',
          { className: 'dcb-head' },
          h('div', { className: 'dcb-headTop' }, h('span', { className: 'dcb-title' }, t('tab.title')), boundThread
            ? h('span', { className: 'dcb-dot', 'data-status': boundThread.status || 'idle', style: { marginTop: 0 } })
            : null),
          h('div', { className: 'dcb-headSub', title: boundThread?.cwd || '' }, headerSub),
        ),
        h(
          'div',
          { className: 'dcb-tools' },
          h('input', {
            className: 'dcb-search',
            type: 'search',
            value: query,
            placeholder: t('ui.search'),
            onChange: (event) => setQuery(event.target.value),
          }),
          h(
            'label',
            { className: 'dcb-toggle' },
            h('input', { type: 'checkbox', checked: showAll, onChange: (event) => setShowAll(event.target.checked) }),
            t('ui.showAll'),
          ),
          h(
            'label',
            { className: 'dcb-toggle' },
            h('input', { type: 'checkbox', checked: hideSide, onChange: (event) => setHideSide(event.target.checked) }),
            t('ui.hideSide'),
          ),
          h('button', { type: 'button', className: 'dcb-iconBtn', onClick: () => loadRoster(), title: t('ui.refresh') }, '↻'),
        ),
        error ? h('div', { className: 'dcb-error' }, error) : null,
        h(
          'div',
          { className: 'dcb-scroll' },
          !roster && !error ? h('div', { className: 'dcb-empty' }, t('ui.loading')) : null,
          roster && roster.threadCount === 0 ? h('div', { className: 'dcb-empty' }, t('ui.empty'), h('div', { className: 'dcb-hint', style: { marginTop: 6 } }, roster.codexHome || ''), h('div', { className: 'dcb-hint', style: { marginTop: 4 } }, t('ui.emptyHint'))) : null,
          roster && roster.threadCount > 0 && groups.length === 0 ? h('div', { className: 'dcb-empty' }, t('ui.noMatch')) : null,
          groups.map(({ group, recent, older }) => {
            const isCollapsed = collapsed[group.id] === true
            const olderVisible = showAll && older.length > 0 && olderOpen[group.id] === true
            return h(
              'div',
              { className: 'dcb-group', key: group.id },
              h(
                'button',
                { type: 'button', className: 'dcb-groupHead', onClick: () => toggleGroup(group.id) },
                h('span', { className: 'dcb-caret' }, isCollapsed ? '▸' : '▾'),
                h('span', { className: 'dcb-groupName', title: (group.roots || []).join('\n') }, group.name),
                h('span', { className: 'dcb-count' }, recent.length + (showAll ? older.length : 0)),
              ),
              !isCollapsed
                ? h(
                    'div',
                    null,
                    recent.map((thread) =>
                      h(ThreadRow, {
                        key: thread.id,
                        thread,
                        bound: thread.id === boundId,
                        now,
                        t,
                        onBind: bind,
                        onOpen: openDetail,
                        busy: busyId === thread.id,
                      }),
                    ),
                    showAll && older.length > 0
                      ? h(
                          'div',
                          { className: 'dcb-older' },
                          h(
                            'button',
                            { type: 'button', className: 'dcb-olderBtn', onClick: () => toggleOlder(group.id) },
                            `${olderOpen[group.id] === true ? '▾' : '▸'} ${t('ui.more')} (${older.length})`,
                          ),
                          olderVisible
                            ? older.map((thread) =>
                                h(ThreadRow, {
                                  key: thread.id,
                                  thread,
                                  bound: thread.id === boundId,
                                  now,
                                  t,
                                  onBind: bind,
                                  onOpen: openDetail,
                                  busy: busyId === thread.id,
                                }),
                              )
                            : null,
                        )
                      : null,
                  )
                : null,
            )
          }),
        ),
        h(
          'div',
          { className: 'dcb-foot' },
          boundThread
            ? h(
                'div',
                { className: 'dcb-boundRow' },
                h('span', { className: 'dcb-dot', 'data-status': boundThread.status || 'idle' }),
                h('span', { className: 'dcb-boundTitle', title: boundThread.cwd || '' }, boundThread.title),
                h('button', { type: 'button', className: 'dcb-linkBtn', onClick: () => setDetailId(boundThread.id) }, t('ui.detail')),
                h('button', { type: 'button', className: 'dcb-linkBtn', onClick: unbind }, t('ui.unbind')),
              )
            : null,
          h('div', { className: 'dcb-hint' }, sessionId ? (boundThread ? t('ui.boundHint') : t('ui.pickHint')) : t('ui.sessionRequired')),
          roster && roster.threadCount > 0 ? h('div', { className: 'dcb-hint' }, t('ui.doubleClick')) : null,
        ),
      )
    }

    function CodexTabTitle(props) {
      const t = props.t || ((key) => key)
      return h('span', { className: 'dcb-tabTitle' }, t('tab.title'))
    }

    function apply(ctx) {
      try {
        applyInner(ctx)
      } catch (error) {
        try {
          console.error('[codex-bridge] apply failed:', error && error.stack ? error.stack : error)
        } catch {}
        throw error
      }
    }

    function applyInner(ctx) {
      ensureStyle()
      ctx.effect(() => ctx.locale.register(NS, DICT), 'codex-bridge: locale')
      const t = ctx.locale.bind(NS)

      const tabs = ctx.sidebarRightTabs ?? ctx.get?.('sidebarRightTabs')
      if (tabs && typeof tabs.register === 'function') {
        ctx.effect(
          () =>
            tabs.register({
              id: TAB_ID,
              kind: KIND,
              title: () => t('tab.title'),
              guide: [
                {
                  id: TAB_ID,
                  kind: KIND,
                  order: 15,
                  title: () => t('tab.title'),
                  description: () => t('tab.description'),
                },
              ],
            }),
          'codex-bridge: tab definition',
        )
      }

      ctx.effect(
        () =>
          ctx.slots.inject('sidebar.right.pane.tab', () =>
            ctx.slots.register({ name: 'sidebar.right.pane.tab', key: TAB_ID, locale: NS }, CodexTab),
          ),
        'codex-bridge: tab body',
      )
      ctx.effect(
        () =>
          ctx.slots.inject('sidebar.right.pane.tab.title', () =>
            ctx.slots.register({ name: 'sidebar.right.pane.tab.title', key: TAB_ID, locale: NS }, CodexTabTitle),
          ),
        'codex-bridge: tab title',
      )
    }

    return { name: '@local/dsh-codex-bridge', inject: ['slots', 'locale', 'sidebarRightTabs'], apply }
  },
})
