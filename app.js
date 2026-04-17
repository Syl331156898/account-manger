// ==================== 云同步数据存储 ====================
let autoSyncTimer = null

function getSyncConfig() {
  return {
    token: localStorage.getItem('github_token') || '',
    gistId: localStorage.getItem('gist_id') || '',
    autoSync: localStorage.getItem('auto_sync') !== 'false'
  }
}

// ==================== 数据迁移：旧格式兼容 ====================
function migrateAccounts() {
  const accounts = JSON.parse(localStorage.getItem('accounts') || '[]')
  let changed = false
  accounts.forEach(a => {
    if (!a.platforms) {
      a.platforms = {
        kiro: { registered: a.registered || false, sold: a.sold || false, registeredAt: a.registeredAt || '', soldAt: a.soldAt || '' },
        trae: { registered: false, sold: false, registeredAt: '', soldAt: '' }
      }
      changed = true
    }
  })
  if (changed) localStorage.setItem('accounts', JSON.stringify(accounts))
}

function getAccounts() {
  return JSON.parse(localStorage.getItem('accounts') || '[]')
}

function saveAccountList(list) {
  localStorage.setItem('accounts', JSON.stringify(list))
  const config = getSyncConfig()
  if (config.autoSync && config.token && config.gistId) {
    clearTimeout(autoSyncTimer)
    autoSyncTimer = setTimeout(() => {
      syncToCloud(true)
    }, 2000) // 延迟2秒自动上传，防止高频操作
  }
}

// ---------------- 云同步核心逻辑 ----------------
async function syncToCloud(isAuto = false) {
  const config = getSyncConfig()
  if (!config.token || !config.gistId) {
    if (!isAuto) showToast('请先配置正确的 Token 和 Gist ID')
    return
  }
  
  if (!isAuto) showToast('正在上传数据到云端...')
  
  const accounts = localStorage.getItem('accounts') || '[]'
  const allTags = localStorage.getItem('allTags') || '[]'
  const dataPayload = { accounts: JSON.parse(accounts), allTags: JSON.parse(allTags) }
  
  try {
    const res = await fetch(`https://api.github.com/gists/${config.gistId}`, {
      method: 'PATCH',
      headers: {
        'Accept': 'application/vnd.github+json',
        'Authorization': `Bearer ${config.token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        description: "Account Manager Sync Data",
        files: {
          "accounts_data.json": {
            content: JSON.stringify(dataPayload, null, 2)
          }
        }
      })
    })
    
    if (res.ok) {
      if (!isAuto) showToast('✅ 成功同步到云端！')
    } else {
      const err = await res.json()
      console.error(err)
      if (!isAuto) showToast('❌ 上传失败，请检查凭证是否正确')
    }
  } catch (error) {
    console.error(error)
    if (!isAuto) showToast('❌ 网络请求失败')
  }
}

async function syncFromCloud(silent = false) {
  const config = getSyncConfig()
  if (!config.token || !config.gistId) {
    if (!silent) showToast('请先配置正确的 Token 和 Gist ID')
    return
  }
  if (!silent) showToast('正在从云端拉取数据...')
  try {
    const res = await fetch(`https://api.github.com/gists/${config.gistId}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/vnd.github+json',
        'Authorization': `Bearer ${config.token}`
      }
    })
    if (res.ok) {
      const gist = await res.json()
      const file = gist.files['accounts_data.json']
      if (file && file.content) {
        const data = JSON.parse(file.content)
        if (data.accounts) localStorage.setItem('accounts', JSON.stringify(data.accounts))
        if (data.allTags) localStorage.setItem('allTags', JSON.stringify(data.allTags))
        renderList()
        showToast('✅ 云端数据已更新')
      } else {
        if (!silent) showToast('❌ Gist 中没找到 accounts_data.json')
      }
    } else {
      if (!silent) showToast('❌ 拉取失败，请检查凭证是否正确')
    }
  } catch (error) {
    console.error(error)
    if (!silent) showToast('❌ 网络请求失败')
  }
}

function saveSyncConfig() {
  const token = document.getElementById('syncToken').value.trim()
  const gistId = document.getElementById('syncGistId').value.trim()
  localStorage.setItem('github_token', token)
  localStorage.setItem('gist_id', gistId)
  showToast('✅ 凭证保存成功')
}

function saveAutoSync(checked) {
  localStorage.setItem('auto_sync', checked ? 'true' : 'false')
}
function getAllTags() {
  return JSON.parse(localStorage.getItem('allTags') || '[]')
}
function saveAllTags(tags) {
  localStorage.setItem('allTags', JSON.stringify(tags))
}
function generatePassword() {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
  const lower = 'abcdefghjkmnpqrstuvwxyz'
  const digits = '0123456789'
  const symbols = '!@#$%^&*+-='
  const all = upper + lower + digits + symbols
  const length = Math.floor(Math.random() * 4) + 10 // 10~13位
  let pwd = [
    upper[Math.floor(Math.random() * upper.length)],
    lower[Math.floor(Math.random() * lower.length)],
    digits[Math.floor(Math.random() * digits.length)],
    symbols[Math.floor(Math.random() * symbols.length)]
  ]
  for (let i = pwd.length; i < length; i++) {
    pwd.push(all[Math.floor(Math.random() * all.length)])
  }
  // 打乱顺序
  for (let i = pwd.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pwd[i], pwd[j]] = [pwd[j], pwd[i]]
  }
  return pwd.join('')
}

// ==================== 英文名库 ====================
const FIRST_NAMES = [
  'James','John','Robert','Michael','William','David','Richard','Joseph','Thomas','Charles',
  'Emily','Emma','Olivia','Sophia','Isabella','Mia','Charlotte','Amelia','Harper','Evelyn',
  'Liam','Noah','Oliver','Elijah','Lucas','Mason','Logan','Ethan','Aiden','Jackson',
  'Ava','Luna','Chloe','Penelope','Layla','Riley','Zoey','Nora','Lily','Eleanor',
  'Jeffrey','Brandon','Nathan','Tyler','Austin','Kevin','Brian','Eric','Adam','Ryan',
  'Jessica','Ashley','Amanda','Melissa','Stephanie','Nicole','Elizabeth','Helen','Sandra','Donna'
]
const LAST_NAMES = [
  'Smith','Johnson','Williams','Brown','Jones','Garcia','Miller','Davis','Wilson','Taylor',
  'Anderson','Thomas','Jackson','White','Harris','Martin','Thompson','Young','Allen','King',
  'Wright','Scott','Torres','Nguyen','Hill','Flores','Green','Adams','Nelson','Baker',
  'Gonzalez','Mitchell','Perez','Roberts','Turner','Phillips','Campbell','Parker','Evans','Edwards',
  'Collins','Stewart','Sanchez','Morris','Rogers','Reed','Cook','Morgan','Bell','Murphy'
]

function randomName() {
  const first = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)]
  const last = LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)]
  return { first, last }
}

// ==================== 账号生成 ====================
// 邮箱前缀黑名单：避免看起来像机器人/测试账号的词
const EMAIL_PREFIX_BLACKLIST = [
  'admin','test','user','root','info','mail','email','demo','guest','support',
  'noreply','no-reply','postmaster','webmaster','hostmaster','abuse','spam',
  'bot','robot','system','service','contact','hello','help','sales','team'
]

function generatePrefix() {
  // 人类命名风格，增加多样性
  let name
  do {
    name = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)].toLowerCase()
  } while (EMAIL_PREFIX_BLACKLIST.includes(name))

  // 随机决定是否加上姓氏首字母
  const addLastInitial = Math.random() > 0.6
  const lastInitial = addLastInitial
    ? LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)][0].toLowerCase()
    : ''

  // 数字：2~5位随机
  const numLen = Math.floor(Math.random() * 4) + 2  // 2,3,4,5
  const num = String(Math.floor(Math.random() * (Math.pow(10, numLen) - Math.pow(10, numLen - 1))) + Math.pow(10, numLen - 1))

  // 名字和数字之间随机加符号（- 或 .），40%概率加，各占一半
  const r = Math.random()
  const sep = r < 0.2 ? '-' : r < 0.4 ? '.' : ''

  return `${name}${lastInitial}${sep}${num}`
}

function generateEmail() {
  return `${generatePrefix()}@qwecht.com`
}

// GitHub 风格用户名：adjective-noun-number
const GH_ADJECTIVES = [
  'cool','swift','brave','calm','dark','eager','fair','glad','happy','jolly',
  'kind','lively','merry','nice','proud','quiet','rapid','sharp','smart','tidy',
  'warm','witty','zesty','bold','bright','clean','crisp','deft','epic','firm',
  'free','fresh','grand','great','keen','lean','neat','pure','safe','true',
  'wild','wise','young','agile','alert','alive','amber','azure','blaze','bloom',
  'cedar','clear','cloud','coral','cozy','curly','cyber','daily','daring','dawn'
]
const GH_NOUNS = [
  'panda','river','stone','cloud','flame','tiger','eagle','ocean','forest','comet',
  'spark','frost','grove','haven','island','jungle','knight','lantern','meadow','nebula',
  'orbit','peak','quest','ridge','shadow','thunder','valley','wave','zenith','anchor',
  'beacon','bridge','canyon','delta','echo','falcon','glacier','harbor','inlet','jaguar',
  'kestrel','lagoon','maple','nomad','osprey','pine','quartz','raven','sierra','tundra'
]

function generateUsername() {
  const adj = () => GH_ADJECTIVES[Math.floor(Math.random() * GH_ADJECTIVES.length)]
  const noun = () => GH_NOUNS[Math.floor(Math.random() * GH_NOUNS.length)]
  const num = () => Math.floor(Math.random() * 900) + 10
  // 生成字母数字混合短串，如 4fg / er5 / x2k
  const alphanum = () => {
    const lc = 'abcdefghijklmnopqrstuvwxyz'
    const dg = '0123456789'
    const all = lc + dg
    const len = Math.floor(Math.random() * 3) + 2 // 2~4位
    // 随机决定数字在前还是在后
    if (Math.random() > 0.5) {
      // 数字开头：如 4fg
      return dg[Math.floor(Math.random() * dg.length)] +
        Array.from({length: len - 1}, () => lc[Math.floor(Math.random() * lc.length)]).join('')
    } else {
      // 字母开头：如 er5
      return lc[Math.floor(Math.random() * lc.length)] +
        Array.from({length: len - 2}, () => all[Math.floor(Math.random() * all.length)]).join('') +
        dg[Math.floor(Math.random() * dg.length)]
    }
  }
  const formats = [
    () => `${adj()}-${num()}-${noun()}`,      // swift-42-panda
    () => `${adj()}-${noun()}-${num()}`,      // swift-panda-42
    () => `${adj()}-${num()}`,                // swift-42
    () => `${noun()}-${num()}`,               // panda-42
    () => `${adj()}-${noun()}`,               // swift-panda
    () => `${adj()}-${num()}-${adj()}`,       // swift-42-bold
    () => `${noun()}-${num()}-${noun()}`,     // panda-42-river
    () => `${adj()}-${noun()}-${adj()}`,      // swift-panda-bold
    () => `${adj()}-${alphanum()}`,           // swift-4fg
    () => `${noun()}-${alphanum()}`,          // panda-er5
    () => `${adj()}-${noun()}-${alphanum()}`, // swift-panda-x2k
  ]
  return formats[Math.floor(Math.random() * formats.length)]()
}

function generateAccount() {
  const { first, last } = randomName()
  return {
    id: Date.now().toString() + Math.random().toString(36).slice(2),
    email: generateEmail(),
    password: generatePassword(),
    username: generateUsername(),
    firstName: first,
    lastName: last,
    tags: [],
    note: '',
    isFavorite: false,
    registered: false,
    platforms: {
      kiro: { registered: false, sold: false, registeredAt: '', soldAt: '' },
      trae: { registered: false, sold: false, registeredAt: '', soldAt: '' }
    },
    createdAt: new Date().toLocaleString('zh-CN')
  }
}

// ==================== 状态 ====================
let selectedTag = ''
let batchCount = 1
let currentDetailId = null
let currentSeg = 'unregistered'
let currentPlatform = 'kiro'

function switchPlatform(platform) {
  currentPlatform = platform
  document.querySelectorAll('#plat-kiro, #plat-trae').forEach(el => el.classList.remove('active'))
  document.getElementById(`plat-${platform}`).classList.add('active')
  renderList()
}

const SEGS = ['unregistered', 'registered', 'sold']

function switchSeg(seg, animate = true) {
  currentSeg = seg
  document.querySelectorAll('#seg-unregistered, #seg-registered, #seg-sold').forEach(el => el.classList.remove('active'))
  document.getElementById(`seg-${seg}`).classList.add('active')
  renderList()
  // 滑动轨道定位
  const idx = SEGS.indexOf(seg)
  const track = document.getElementById('swipeTrack')
  if (track) {
    if (animate) {
      track.style.transition = 'transform 0.32s cubic-bezier(0.25,1,0.5,1)'
    } else {
      track.style.transition = 'none'
    }
    track.style.transform = `translateX(-${idx * 33.333}%)`
  }
}

// ==================== Tab 切换 ====================
function switchTab(tab) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'))
  document.querySelectorAll('.tab-item').forEach(t => t.classList.remove('active'))
  document.getElementById(`page-${tab}`).classList.add('active')
  document.querySelector(`[data-tab="${tab}"]`).classList.add('active')
  sessionStorage.setItem('activeTab', tab)

  if (tab === 'list') renderList()
  if (tab === 'generator') initGeneratorPage()
  if (tab === 'sync') initSyncPage()
  if (tab === 'register') initRegisterPage()
}

function initSyncPage() {
  const config = getSyncConfig()
  document.getElementById('syncToken').value = config.token
  document.getElementById('syncGistId').value = config.gistId
  document.getElementById('autoSyncCheckbox').checked = config.autoSync
}

// ==================== 列表页 ====================
function renderSegPanel(seg, accounts, container) {
  const p = currentPlatform
  const unregistered = accounts.filter(a => { const s = a.platforms?.[p]; return s && !s.registered && !s.sold })
  const registered   = accounts.filter(a => { const s = a.platforms?.[p]; return s && s.registered && !s.sold })
  const sold         = accounts.filter(a => { const s = a.platforms?.[p]; return s && s.sold })
  const segMap = { unregistered, registered, sold }
  const segFiltered = segMap[seg]

  const filtered = segFiltered.filter(a => !selectedTag || a.tags.includes(selectedTag))

  if (filtered.length === 0) {
    container.innerHTML = '<div class="empty">暂无账号</div>'
    return
  }

  container.innerHTML = filtered.map(a => {
    let actionBtn = ''
    if (seg === 'unregistered') {
      actionBtn = `<button class="reg-btn" onclick="event.stopPropagation(); setStatus('${a.id}', 'registered')">标记已注册</button>`
    } else if (seg === 'registered') {
      actionBtn = `
        <button class="reg-btn" onclick="event.stopPropagation(); setStatus('${a.id}', 'unregistered')">移回未注册</button>
        <button class="sold-btn" onclick="event.stopPropagation(); setStatus('${a.id}', 'sold')">标记号已出</button>`
    } else if (seg === 'sold') {
      actionBtn = `<button class="reg-btn" onclick="event.stopPropagation(); setStatus('${a.id}', 'registered')">移回已注册</button>`
    }
    return `
      <div class="account-card" onclick="openDetail('${a.id}')">
        <div class="card-row">
          <span class="card-label">账号</span>
          <span class="email">${a.email}</span>
          <button class="inline-copy" onclick="event.stopPropagation(); copyText('${a.email}', '账号')">复制</button>
        </div>
        <div class="card-row">
          <span class="card-label">密码</span>
          <span class="card-pwd">${a.password}</span>
          <button class="inline-copy" onclick="event.stopPropagation(); copyText('${a.password}', '密码')">复制</button>
        </div>
        <div class="card-row">
          <span class="card-label">姓名</span>
          <span class="card-pwd">${a.username}</span>
          <button class="inline-copy" onclick="event.stopPropagation(); copyText('${a.username}', '姓名')">复制</button>
        </div>
        ${a.tags.length ? `<div class="tag-list">${a.tags.map(t => `<span class="tag-badge">${t}</span>`).join('')}</div>` : ''}
        <div class="card-bottom">
          <span class="date">${
            seg === 'unregistered' ? `生成日期 ${a.createdAt}` :
            seg === 'registered'   ? `注册日期 ${a.platforms?.[currentPlatform]?.registeredAt || a.createdAt}` :
            `出售日期 ${a.platforms?.[currentPlatform]?.soldAt || a.createdAt}`
          }</span>
          <div style="display:flex;gap:10px;align-items:center">
            ${actionBtn}
            <button class="delete-btn" onclick="event.stopPropagation(); deleteAccount('${a.id}')">删除</button>
          </div>
        </div>
      </div>`
  }).join('')
}

function renderList() {
  const accounts = getAccounts()
  const p = currentPlatform

  const unregistered = accounts.filter(a => { const s = a.platforms?.[p]; return s && !s.registered && !s.sold })
  const registered   = accounts.filter(a => { const s = a.platforms?.[p]; return s && s.registered && !s.sold })
  const sold         = accounts.filter(a => { const s = a.platforms?.[p]; return s && s.sold })

  document.getElementById('seg-unregistered').textContent = `未注册 ${unregistered.length}`
  document.getElementById('seg-registered').textContent   = `已注册 ${registered.length}`
  document.getElementById('seg-sold').textContent         = `号已出 ${sold.length}`

  // 标签筛选（基于当前分栏）
  const segMap = { unregistered, registered, sold }
  const segFiltered = segMap[currentSeg]
  const allTags = [...new Set(segFiltered.flatMap(a => a.tags))]
  const tagFilter = document.getElementById('tagFilter')
  tagFilter.innerHTML = ''
  if (allTags.length) {
    tagFilter.style.display = 'flex'
    const allChip = document.createElement('button')
    allChip.className = 'tag-chip' + (selectedTag === '' ? ' active' : '')
    allChip.textContent = '全部'
    allChip.onclick = () => { selectedTag = ''; renderList() }
    tagFilter.appendChild(allChip)
    allTags.forEach(tag => {
      const chip = document.createElement('button')
      chip.className = 'tag-chip' + (selectedTag === tag ? ' active' : '')
      chip.textContent = tag
      chip.onclick = () => { selectedTag = selectedTag === tag ? '' : tag; renderList() }
      tagFilter.appendChild(chip)
    })
  } else {
    tagFilter.style.display = 'none'
  }

  // 渲染三个面板
  SEGS.forEach((seg, i) => {
    const container = document.getElementById(`accountList-${i}`)
    if (container) renderSegPanel(seg, accounts, container)
  })
}

function toggleFavorite(id) {
  const accounts = getAccounts()
  const a = accounts.find(x => x.id === id)
  if (a) { a.isFavorite = !a.isFavorite; saveAccountList(accounts); renderList() }
}

function deleteAccount(id) {
  if (!confirm('确认删除？删除后不可恢复')) return
  saveAccountList(getAccounts().filter(a => a.id !== id))
  renderList()
}

function toggleRegistered(id) {
  const accounts = getAccounts()
  const a = accounts.find(x => x.id === id)
  if (a) { a.registered = !a.registered; saveAccountList(accounts); renderList() }
}

function setStatus(id, status) {
  const accounts = getAccounts()
  const a = accounts.find(x => x.id === id)
  if (!a) return
  if (!a.platforms) a.platforms = {
    kiro: { registered: false, sold: false, registeredAt: '', soldAt: '' },
    trae: { registered: false, sold: false, registeredAt: '', soldAt: '' }
  }

  const platforms = status === 'registered' || status === 'unregistered'
    ? ['kiro', 'trae']       // 注册/取消注册 两个平台同步
    : [currentPlatform]      // 号已出/移回已注册 只影响当前平台

  platforms.forEach(p => {
    const s = a.platforms[p]
    s.registered = status === 'registered'
    s.sold = status === 'sold'
    if (status === 'registered' && !s.registeredAt) s.registeredAt = new Date().toLocaleString('zh-CN')
    if (status === 'sold') s.soldAt = new Date().toLocaleString('zh-CN')
    if (status === 'unregistered') { s.registeredAt = ''; s.soldAt = '' }
  })

  saveAccountList(accounts)
  renderList()
}

// ==================== 生成页 ====================
let previewAccount = null
let currentGenPlatform = 'duck'

const GEN_SEGS = ['duck', 'github']

function switchGenSeg(platform, animate = true) {
  currentGenPlatform = platform
  document.querySelectorAll('#gen-seg-github, #gen-seg-duck').forEach(el => el.classList.remove('active'))
  document.getElementById(`gen-seg-${platform}`).classList.add('active')
  refreshPreview()
  const idx = GEN_SEGS.indexOf(platform)
  const track = document.getElementById('genSwipeTrack')
  if (track) {
    track.style.transition = animate ? 'transform 0.32s cubic-bezier(0.25,1,0.5,1)' : 'none'
    track.style.transform = `translateX(-${idx * 50}%)`
  }
}

function generate163Username() {
  // 网易邮箱：6-18位，字母开头，字母数字下划线
  const letters = 'abcdefghijklmnopqrstuvwxyz'
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789_'
  const length = Math.floor(Math.random() * 7) + 6 // 6~12位
  let name = letters[Math.floor(Math.random() * letters.length)]
  for (let i = 1; i < length; i++) {
    name += chars[Math.floor(Math.random() * chars.length)]
  }
  return name
}

function generateProtonPrefix() {
  const letters = 'abcdefghijklmnopqrstuvwxyz'
  const words = ['sky','fox','wolf','bear','hawk','storm','river','stone','fire','moon',
    'star','cloud','wind','rain','snow','peak','lake','hill','vale','grove',
    'ash','elm','oak','pine','reed','sage','wren','dove','swift','crane']
  const w1 = words[Math.floor(Math.random() * words.length)]
  const w2 = words[Math.floor(Math.random() * words.length)]
  const num = Math.floor(Math.random() * 9000) + 100
  const patterns = [
    `${w1}${w2}`,
    `${w1}${w2}${num}`,
    `${w1}${num}`,
    `${w2}${w1}`,
    `${w1}${w2.slice(0,3)}${num}`,
  ]
  return patterns[Math.floor(Math.random() * patterns.length)]
}

function generateAccountForProton() {
  const { first, last } = randomName()
  const addNum = Math.random() > 0.6
  const numStr = addNum ? String(Math.floor(Math.random() * 999) + 1) : ''
  const numPos = Math.random() > 0.5 ? 'after' : 'before'
  const username = addNum
    ? (numPos === 'after' ? `${first} ${last}${numStr}` : `${numStr}${first} ${last}`)
    : `${first} ${last}`
  return {
    id: Date.now().toString() + Math.random().toString(36).slice(2),
    email: `${generateProtonPrefix()}@proton.me`,
    password: generatePassword(),
    username,
    firstName: first,
    lastName: last,
    platform: 'proton',
    tags: [],
    note: '',
    isFavorite: false,
    registered: false,
    createdAt: new Date().toLocaleString('zh-CN')
  }
}

function generateAccountForDuck(prefix) {
  const { first, last } = randomName()
  return {
    id: Date.now().toString() + Math.random().toString(36).slice(2),
    email: `${prefix}@duck.com`,
    password: generatePassword(),
    username: generateUsername(),
    firstName: first,
    lastName: last,
    platform: 'duck',
    tags: [],
    note: '',
    isFavorite: false,
    registered: false,
    platforms: {
      kiro: { registered: false, sold: false, registeredAt: '', soldAt: '' },
      trae: { registered: false, sold: false, registeredAt: '', soldAt: '' }
    },
    createdAt: new Date().toLocaleString('zh-CN')
  }
}

function generateAccountFor163() {
  const { first, last } = randomName()
  const username163 = generate163Username()
  return {
    id: Date.now().toString() + Math.random().toString(36).slice(2),
    email: `${username163}@126.com`,
    password: generatePassword(),
    username: generateUsername(),
    firstName: first,
    lastName: last,
    platform: '163',
    tags: [],
    note: '',
    isFavorite: false,
    registered: false,
    createdAt: new Date().toLocaleString('zh-CN')
  }
}

function initGeneratorPage() {
  refreshPreview()
}

function changeBatch(delta) {
  batchCount = Math.max(1, Math.min(50, batchCount + delta))
  document.getElementById('batchNum').textContent = batchCount
  const btn = document.querySelector('.btn-primary')
  btn.textContent = batchCount === 1 ? '生成并保存' : `批量生成 ${batchCount} 个`
}

function refreshPreview() {
  if (currentGenPlatform === 'duck') {
    const prefix = (document.getElementById('duckPrefix') || {}).value || ''
    previewAccount = generateAccountForDuck(prefix)
    document.getElementById('previewContent').innerHTML = `
      <div class="preview-row">
        <span class="preview-label">邮箱</span>
        <input id="duckPrefix" class="preview-value preview-input-wide" placeholder="输入邮箱" value="${prefix}"
          style="border:none;outline:none;background:transparent;text-align:right;flex:1;min-width:0;"
          autocomplete="off" autocorrect="off" spellcheck="false"
          oninput="updateDuckEmail(this.value)" />
      </div>
      <div class="preview-row">
        <span class="preview-label">密码</span>
        <input id="duckPwd" class="preview-value" value="${previewAccount.password}"
          style="border:none;outline:none;background:transparent;text-align:right;flex:1;min-width:0;"
          oninput="previewAccount.password=this.value" />
        <button class="refresh-field-btn" onclick="refreshField('password')" title="重新生成密码">↻</button>
      </div>
      <div class="preview-row">
        <span class="preview-label">用户名</span>
        <input id="duckUsername" class="preview-value" value="${previewAccount.username}"
          style="border:none;outline:none;background:transparent;text-align:right;flex:1;min-width:0;"
          oninput="previewAccount.username=this.value" />
        <button class="refresh-field-btn" onclick="refreshField('username')" title="重新生成用户名">↻</button>
      </div>
    `
    return
  }
  previewAccount = generateAccount()
  document.getElementById('previewContentGithub').innerHTML = `
    <div class="preview-row">
      <span class="preview-label">邮箱</span>
      <input id="previewEmail" class="preview-value" value="${previewAccount.email}"
        style="border:none;outline:none;background:transparent;text-align:right;flex:1;min-width:0;"
        oninput="previewAccount.email=this.value" />
      <button class="refresh-field-btn" onclick="refreshField('email')" title="重新生成邮箱">↻</button>
    </div>
    <div class="preview-row">
      <span class="preview-label">密码</span>
      <span id="previewPwd" class="preview-value" style="flex:1;min-width:0;text-align:right;">${previewAccount.password}</span>
      <button class="refresh-field-btn" onclick="refreshField('password')" title="重新生成密码">↻</button>
    </div>
    <div class="preview-row">
      <span class="preview-label">用户名</span>
      <span id="previewUsername" class="preview-value" style="flex:1;min-width:0;text-align:right;">${previewAccount.username}</span>
      <button class="refresh-field-btn" onclick="refreshField('username')" title="重新生成用户名">↻</button>
    </div>
  `
}

function updateDuckEmail(val) {
  if (previewAccount) previewAccount.email = val
}

function refreshField(field) {
  if (!previewAccount) return
  if (field === 'email') {
    const newEmail = generateEmail()
    previewAccount.email = newEmail
    const inputEl = document.getElementById('previewEmail')
    if (inputEl) inputEl.value = newEmail
  } else if (field === 'password') {
    const newPwd = generatePassword()
    previewAccount.password = newPwd
    const inputEl = document.getElementById('duckPwd')
    const spanEl = document.getElementById('previewPwd')
    if (inputEl) inputEl.value = newPwd
    else if (spanEl) spanEl.textContent = newPwd
  } else if (field === 'username') {
    const newName = generateUsername()
    previewAccount.username = newName
    const inputEl = document.getElementById('duckUsername')
    const spanEl = document.getElementById('previewUsername')
    if (inputEl) inputEl.value = newName
    else if (spanEl) spanEl.textContent = newName
  }
}

function doSaveSingle() {
  if (!previewAccount) return
  if (currentGenPlatform === 'duck') {
    const email = (document.getElementById('duckPrefix') || {}).value || ''
    if (!email.trim()) { showToast('请先输入邮箱'); return }
    previewAccount.email = email.trim()
    previewAccount.password = document.getElementById('duckPwd').value || previewAccount.password
    previewAccount.username = document.getElementById('duckUsername').value || previewAccount.username
  }
  const accounts = getAccounts()
  const dup = accounts.find(a => !a.registered && !a.sold && a.email === previewAccount.email)
  if (dup) { showToast('⚠️ 未注册列表已有相同邮箱'); return }
  accounts.unshift({...previewAccount})
  saveAccountList(accounts)
  showToast('已保存当前账号')
  if (currentGenPlatform === 'duck') {
    const newAcc = generateAccountForDuck('')
    previewAccount = newAcc
    document.getElementById('duckPrefix').value = ''
    document.getElementById('duckPwd').value = newAcc.password
    document.getElementById('duckUsername').value = newAcc.username
    return
  }
  refreshPreview()
}

function doSaveAccounts() {
  if (currentGenPlatform === 'duck') { doSaveSingle(); return }
  const accounts = getAccounts()
  const existing = new Set(accounts.filter(a => !a.registered && !a.sold).map(a => a.email))
  let saved = 0, skipped = 0
  for (let i = 0; i < batchCount; i++) {
    const acc = generateAccount()
    if (existing.has(acc.email)) { skipped++; continue }
    existing.add(acc.email)
    accounts.unshift(acc)
    saved++
  }
  saveAccountList(accounts)
  refreshPreview()
  showToast(skipped ? `已保存 ${saved} 个，跳过 ${skipped} 个重复` : `已保存 ${saved} 个账号`)
}

// ==================== 详情弹窗 ====================
function openDetail(id) {
  currentDetailId = id
  renderDetail()
  document.getElementById('detailModal').classList.remove('hidden')
}

function closeDetail() {
  document.getElementById('detailModal').classList.add('hidden')
  currentDetailId = null
  renderList()
}

function copyAccountInfo() {
  const accounts = getAccounts()
  const a = accounts.find(x => x.id === currentDetailId)
  if (!a) return
  const text = `账号：${a.email}\n密码：${a.password}`
  copyText(text, '账号信息')
}

function renderDetail() {
  const accounts = getAccounts()
  const a = accounts.find(x => x.id === currentDetailId)
  if (!a) return

  document.getElementById('detailContent').innerHTML = `
    <div class="info-row">
      <span class="info-label">邮箱</span>
      <span class="info-value">${a.email}</span>
      <button class="copy-btn" onclick="copyText('${a.email}', '邮箱')">复制</button>
    </div>
    <div class="info-row">
      <span class="info-label">密码</span>
      <span class="info-value">${a.password}</span>
      <button class="copy-btn" onclick="copyText('${a.password}', '密码')">复制</button>
    </div>
    <div class="info-row">
      <span class="info-label">用户名</span>
      <span class="info-value">${a.username}</span>
      <button class="copy-btn" onclick="copyText('${a.username}', '用户名')">复制</button>
    </div>
    <div class="info-row">
      <span class="info-label">创建时间</span>
      <span class="info-value" style="font-family:inherit;font-size:12px">${a.createdAt}</span>
    </div>
    ${a.platforms?.[currentPlatform]?.registered && a.platforms?.[currentPlatform]?.registeredAt ? `
    <div class="info-row">
      <span class="info-label">注册时间</span>
      <span class="info-value" style="font-family:inherit;font-size:12px">${a.platforms[currentPlatform].registeredAt}</span>
    </div>` : ''}
    ${a.platforms?.[currentPlatform]?.sold && a.platforms?.[currentPlatform]?.soldAt ? `
    <div class="info-row">
      <span class="info-label">出号时间</span>
      <span class="info-value" style="font-family:inherit;font-size:12px">${a.platforms[currentPlatform].soldAt}</span>
    </div>` : ''}

    <div class="detail-section">
      <div class="detail-section-title">标签</div>
      <div class="tag-manage" id="tagManage">
        ${a.tags.map(t => `
          <div class="tag-manage-item">
            <span class="tag-manage-text">${t}</span>
            <button class="tag-del-btn" onclick="removeTag('${t}')">×</button>
          </div>
        `).join('')}
      </div>
      <div class="add-tag-row">
        <input type="text" id="newTagInput" placeholder="输入新标签" maxlength="10" onkeydown="if(event.key==='Enter') addTag()" />
        <button onclick="addTag()">添加</button>
      </div>
    </div>

    <div class="detail-section">
      <div class="detail-section-title">备注</div>
      <textarea class="detail-textarea" id="noteInput" onblur="saveNote()">${a.note}</textarea>
    </div>
  `
}

function savePassword() {
  const accounts = getAccounts()
  const a = accounts.find(x => x.id === currentDetailId)
  if (a) { a.password = document.getElementById('detailPwd').value; saveAccountList(accounts) }
}

function updateFavorite(val) {
  const accounts = getAccounts()
  const a = accounts.find(x => x.id === currentDetailId)
  if (a) { a.isFavorite = val; saveAccountList(accounts) }
}

function saveNote() {
  const accounts = getAccounts()
  const a = accounts.find(x => x.id === currentDetailId)
  if (a) { a.note = document.getElementById('noteInput').value; saveAccountList(accounts) }
}

function addPresetTag(tag) {
  const accounts = getAccounts()
  const a = accounts.find(x => x.id === currentDetailId)
  if (!a || a.tags.includes(tag)) { showToast(`已有标签 ${tag}`); return }
  a.tags.push(tag)
  saveAccountList(accounts)
  renderDetail()
}

function addTag() {
  const input = document.getElementById('newTagInput')
  const tag = input.value.trim()
  if (!tag) return
  const accounts = getAccounts()
  const a = accounts.find(x => x.id === currentDetailId)
  if (!a || a.tags.includes(tag)) return
  a.tags.push(tag)
  saveAccountList(accounts)
  const allTags = getAllTags()
  if (!allTags.includes(tag)) { allTags.push(tag); saveAllTags(allTags) }
  input.value = ''
  renderDetail()
}

function removeTag(tag) {
  const accounts = getAccounts()
  const a = accounts.find(x => x.id === currentDetailId)
  if (a) { a.tags = a.tags.filter(t => t !== tag); saveAccountList(accounts); renderDetail() }
}

function copyText(text, label) {
  // 126邮箱账号只复制@前面的用户名部分
  const copyVal = (label === '账号' && text.endsWith('@126.com')) ? text.split('@')[0] : text
  navigator.clipboard.writeText(copyVal).then(() => showToast(`已复制${label}`))
}

// ==================== Toast ====================
let toastTimer = null
function showToast(msg) {
  const el = document.getElementById('toast')
  el.textContent = msg
  el.classList.remove('hidden')
  // Use a slight delay to allow display:block to apply before adding opacity
  setTimeout(() => el.classList.add('show'), 10)
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => {
    el.classList.remove('show')
    setTimeout(() => el.classList.add('hidden'), 300) // Wait for transition
  }, 2000)
}

// ==================== 下拉刷新 ====================
function initPullToRefresh() {
  const wrapper = document.getElementById('swipeWrapper')
  const indicator = document.getElementById('pullRefreshIndicator')
  const text = document.getElementById('pullRefreshText')
  const arrow = document.getElementById('pullArrow')
  let startY = 0, pulling = false, triggered = false

  const THRESHOLD = 50

  const getCurrentPanel = () => {
    const idx = SEGS.indexOf(currentSeg)
    return document.getElementById(`accountList-${idx}`)
  }

  wrapper.addEventListener('touchstart', e => {
    const panel = getCurrentPanel()
    if (panel && panel.scrollTop === 0) {
      startY = e.touches[0].clientY
      pulling = true
      triggered = false
    }
  }, { passive: true })

  wrapper.addEventListener('touchmove', e => {
    if (!pulling) return
    const dy = e.touches[0].clientY - startY
    if (dy <= 0) { pulling = false; return }
    e.preventDefault()
    const resistance = dy < THRESHOLD ? 0.65 : 0.4
    const h = Math.min(dy * resistance, THRESHOLD + 16)
    indicator.style.height = h + 'px'
    if (dy > THRESHOLD) {
      if (!triggered) { indicator.classList.add('ready'); text.textContent = '松开立即刷新' }
      triggered = true
    } else {
      indicator.classList.remove('ready')
      text.textContent = '下拉获取云端数据'
      triggered = false
    }
  }, { passive: false })

  wrapper.addEventListener('touchend', async () => {
    if (!pulling) return
    pulling = false
    if (triggered) {
      indicator.classList.remove('ready')
      indicator.classList.add('loading')
      indicator.style.height = '44px'
      text.textContent = '正在同步...'
      await syncFromCloud(true)
      indicator.classList.remove('loading')
    }
    indicator.style.height = '0'
    text.textContent = '下拉获取云端数据'
    triggered = false
  })
}
migrateAccounts()

// 恢复上次所在 tab（更新刷新后保持位置）
const _savedTab = sessionStorage.getItem('activeTab') || 'list'
switchTab(_savedTab)

// 初始化下拉刷新
initPullToRefresh()

// ==================== 左右滑动切换分栏 ====================
function initSwipeSegment() {
  const wrapper = document.getElementById('swipeWrapper')
  const track = document.getElementById('swipeTrack')
  if (!wrapper || !track) return

  let startX = 0, startY = 0, curX = 0
  let dragging = false, dirLocked = false, isHoriz = false
  const W = () => wrapper.offsetWidth

  wrapper.addEventListener('touchstart', e => {
    startX = e.touches[0].clientX
    startY = e.touches[0].clientY
    curX = 0
    dragging = true
    dirLocked = false
    isHoriz = false
    track.style.transition = 'none'
  }, { passive: true })

  wrapper.addEventListener('touchmove', e => {
    if (!dragging) return
    const dx = e.touches[0].clientX - startX
    const dy = e.touches[0].clientY - startY

    if (!dirLocked) {
      if (Math.abs(dx) > 6 || Math.abs(dy) > 6) {
        dirLocked = true
        isHoriz = Math.abs(dx) > Math.abs(dy)
      }
    }
    if (!isHoriz) return

    curX = dx
    const idx = SEGS.indexOf(currentSeg)
    // 边界阻尼：到头了继续拖有阻力
    let resistance = 1
    if ((idx === 0 && dx > 0) || (idx === SEGS.length - 1 && dx < 0)) {
      resistance = 0.2
    }
    const base = -(idx * W())
    track.style.transform = `translateX(${base + curX * resistance}px)`
  }, { passive: true })

  wrapper.addEventListener('touchend', () => {
    if (!dragging || !isHoriz) { dragging = false; return }
    dragging = false
    const idx = SEGS.indexOf(currentSeg)
    const threshold = W() * 0.25  // 滑超过25%宽度才切换

    if (curX < -threshold && idx < SEGS.length - 1) {
      switchSeg(SEGS[idx + 1])
    } else if (curX > threshold && idx > 0) {
      switchSeg(SEGS[idx - 1])
    } else {
      // 弹回
      track.style.transition = 'transform 0.32s cubic-bezier(0.25,1,0.5,1)'
      track.style.transform = `translateX(${-(idx * W())}px)`
    }
  }, { passive: true })
}
initSwipeSegment()

// ==================== 生成页左右滑动 ====================
function initGenSwipe() {
  const wrapper = document.getElementById('genSwipeWrapper')
  const track = document.getElementById('genSwipeTrack')
  if (!wrapper || !track) return

  let startX = 0, startY = 0, curX = 0
  let dragging = false, dirLocked = false, isHoriz = false
  const W = () => wrapper.offsetWidth

  wrapper.addEventListener('touchstart', e => {
    startX = e.touches[0].clientX
    startY = e.touches[0].clientY
    curX = 0
    dragging = true
    dirLocked = false
    isHoriz = false
    track.style.transition = 'none'
  }, { passive: true })

  wrapper.addEventListener('touchmove', e => {
    if (!dragging) return
    const dx = e.touches[0].clientX - startX
    const dy = e.touches[0].clientY - startY
    if (!dirLocked) {
      if (Math.abs(dx) > 6 || Math.abs(dy) > 6) {
        dirLocked = true
        isHoriz = Math.abs(dx) > Math.abs(dy)
      }
    }
    if (!isHoriz) return
    curX = dx
    const idx = GEN_SEGS.indexOf(currentGenPlatform)
    let resistance = 1
    if ((idx === 0 && dx > 0) || (idx === GEN_SEGS.length - 1 && dx < 0)) resistance = 0.2
    const base = -(idx * W())
    track.style.transform = `translateX(${base + curX * resistance}px)`
  }, { passive: true })

  wrapper.addEventListener('touchend', () => {
    if (!dragging || !isHoriz) { dragging = false; return }
    dragging = false
    const idx = GEN_SEGS.indexOf(currentGenPlatform)
    const threshold = W() * 0.25
    if (curX < -threshold && idx < GEN_SEGS.length - 1) {
      switchGenSeg(GEN_SEGS[idx + 1])
    } else if (curX > threshold && idx > 0) {
      switchGenSeg(GEN_SEGS[idx - 1])
    } else {
      track.style.transition = 'transform 0.32s cubic-bezier(0.25,1,0.5,1)'
      track.style.transform = `translateX(${-(idx * W())}px)`
    }
  }, { passive: true })
}
initGenSwipe()

// 启动后静默拉云端
syncFromCloud(true)

// 启动屏淡出
window.addEventListener('load', () => {
  const splash = document.getElementById('splash')
  if (splash) {
    splash.style.opacity = '0'
    setTimeout(() => splash.style.display = 'none', 300)
  }
})

// ==================== 注册辅助页 ====================
let registerCurrentId = null

function initRegisterPage() {
  const accounts = getAccounts()
  const first = accounts.find(a => !a.registered && !a.sold)
  registerCurrentId = first ? first.id : null
  renderRegisterAccount()
}

function renderRegisterAccount() {
  const el = document.getElementById('registerAccountInfo')
  if (!registerCurrentId) {
    el.innerHTML = '<div class="empty" style="padding:20px 0">暂无未注册账号</div>'
    return
  }
  const a = getAccounts().find(x => x.id === registerCurrentId)
  if (!a) { el.innerHTML = '<div class="empty" style="padding:20px 0">暂无未注册账号</div>'; return }
  el.innerHTML = `
    <div class="info-row">
      <span class="info-label">邮箱</span>
      <span class="info-value">${a.email}</span>
      <button class="copy-btn" onclick="copyText('${a.email}', '邮箱')">复制</button>
    </div>
    <div class="info-row">
      <span class="info-label">密码</span>
      <span class="info-value">${a.password}</span>
      <button class="copy-btn" onclick="copyText('${a.password}', '密码')">复制</button>
    </div>
    <div class="info-row">
      <span class="info-label">用户名</span>
      <span class="info-value">${a.username}</span>
      <button class="copy-btn" onclick="copyText('${a.username}', '用户名')">复制</button>
    </div>
  `
}

function switchToNextRegister() {
  const accounts = getAccounts().filter(a => !a.registered && !a.sold)
  if (!accounts.length) return
  const idx = accounts.findIndex(a => a.id === registerCurrentId)
  const next = accounts[(idx + 1) % accounts.length]
  registerCurrentId = next.id
  renderRegisterAccount()
}

function markCurrentRegistered() {
  if (!registerCurrentId) return
  setStatus(registerCurrentId, 'registered')
  showToast('已标记为已注册')
  // 自动切换到下一个
  const accounts = getAccounts().filter(a => !a.registered && !a.sold)
  registerCurrentId = accounts.length ? accounts[0].id : null
  renderRegisterAccount()
}


let APP_VERSION = 'V1.1.8'

// 检查版本更新
async function checkForUpdate(silent = true) {
  try {
    const r = await fetch('./version.json', { cache: 'no-store' })
    const d = await r.json()
    const latest = 'V' + d.version
    const el = document.getElementById('appVersion')
    if (el) el.textContent = '当前版本 ' + latest

    if (latest !== APP_VERSION) {
      // 通知 SW 预加载新版本
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage('skipWaiting')
      }
      // 无论 silent 与否，都弹窗让用户决定
      showUpdateDialog(APP_VERSION, latest)
      APP_VERSION = latest
    } else {
      if (!silent) showToast(`已是最新版本 ${latest}`)
    }
  } catch (e) {
    if (!silent) showToast('检查更新失败，请检查网络')
  }
}

function showUpdateDialog(oldVer, newVer) {
  // 避免重复弹
  if (document.getElementById('updateDialog')) return

  const mask = document.createElement('div')
  mask.id = 'updateDialog'
  mask.style.cssText = `
    position:fixed;inset:0;z-index:9999;
    display:flex;align-items:center;justify-content:center;
    background:rgba(15,23,42,0.55);backdrop-filter:blur(3px);
  `

  mask.innerHTML = `
    <div style="
      background:#fff;border-radius:20px;padding:28px 24px 20px;
      width:calc(100% - 48px);max-width:320px;
      box-shadow:0 20px 60px rgba(0,0,0,0.2);
      animation:fadeIn 0.25s ease;
    ">
      <div style="font-size:32px;text-align:center;margin-bottom:12px;">🆕</div>
      <div style="font-size:17px;font-weight:700;color:#0f172a;text-align:center;margin-bottom:8px;">发现新版本</div>
      <div style="font-size:13px;color:#64748b;text-align:center;margin-bottom:24px;">
        ${oldVer} → <span style="color:#3b82f6;font-weight:600;">${newVer}</span>
      </div>
      <button id="updateNowBtn" style="
        width:100%;padding:13px;background:linear-gradient(135deg,#3b82f6,#2563eb);
        color:#fff;border:none;border-radius:12px;font-size:15px;font-weight:600;
        cursor:pointer;margin-bottom:10px;
        box-shadow:0 4px 12px rgba(59,130,246,0.35);
      ">立即更新</button>
      <button id="updateLaterBtn" style="
        width:100%;padding:13px;background:#f1f5f9;
        color:#64748b;border:none;border-radius:12px;font-size:15px;font-weight:500;
        cursor:pointer;
      ">稍后再说</button>
    </div>
  `

  document.body.appendChild(mask)

  document.getElementById('updateNowBtn').onclick = () => {
    mask.remove()
    showToast('正在更新...')
    setTimeout(() => window.location.reload(true), 600)
  }
  document.getElementById('updateLaterBtn').onclick = () => {
    mask.remove()
  }
}

function forceRefresh() {
  checkForUpdate(false)
}

// 页面加载后检查一次，之后每 5 分钟静默检查
fetch('./version.json', { cache: 'no-store' }).then(r => r.json()).then(d => {
  APP_VERSION = 'V' + d.version
  const el = document.getElementById('appVersion')
  if (el) el.textContent = '当前版本 ' + APP_VERSION
}).catch(() => {})

// SW 控制权切换时自动刷新（由 index.html 统一处理）

setInterval(() => checkForUpdate(true), 30 * 1000)
