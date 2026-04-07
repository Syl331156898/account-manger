// ==================== 云同步数据存储 ====================
let autoSyncTimer = null

function getSyncConfig() {
  return {
    token: localStorage.getItem('github_token') || '',
    gistId: localStorage.getItem('gist_id') || '',
    autoSync: localStorage.getItem('auto_sync') !== 'false'
  }
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

async function syncFromCloud() {
  const config = getSyncConfig()
  if (!config.token || !config.gistId) {
    showToast('请先配置正确的 Token 和 Gist ID')
    return
  }
  
  showToast('正在从云端拉取数据...')
  try {
    const res = await fetch(`https://api.github.com/gists/${config.gistId}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/vnd.github+json',
        'Authorization': `Bearer ${config.token}`
      }
    })
    
    if (res.ok) {
      const gist = await res.json();
      const file = gist.files["accounts_data.json"];
      if (file && file.content) {
        const data = JSON.parse(file.content);
        if (data.accounts) localStorage.setItem('accounts', JSON.stringify(data.accounts));
        if (data.allTags) localStorage.setItem('allTags', JSON.stringify(data.allTags));
        
        renderList();
        showToast('✅ 成功拉取并覆盖本地数据！')
      } else {
        showToast('❌ Gist 中没找到 accounts_data.json')
      }
    } else {
      showToast('❌ 拉取失败，请检查凭证是否正确')
    }
  } catch (error) {
    console.error(error)
    showToast('❌ 网络请求失败')
  }
}

function saveSyncConfig() {
  const token = document.getElementById('syncToken').value.trim()
  const gistId = document.getElementById('syncGistId').value.trim()
  localStorage.setItem('github_token', token)
  localStorage.setItem('gist_id', gistId)
  showToast('✅ 凭证保存成功')
}

function saveDdgToken() {
  const token = document.getElementById('ddgToken').value.trim()
  localStorage.setItem('ddg_token', token)
  showToast('✅ Duck Token 保存成功')
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
function generatePrefix() {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
  const symbols = '._-'
  const length = Math.floor(Math.random() * 7) + 6
  let prefix = ''
  for (let i = 0; i < length; i++) {
    const last = prefix[prefix.length - 1] || ''
    const lastIsSymbol = symbols.includes(last)
    if (i === 0 || i === length - 1 || lastIsSymbol || Math.random() > 0.2) {
      prefix += chars[Math.floor(Math.random() * chars.length)]
    } else {
      prefix += symbols[Math.floor(Math.random() * symbols.length)]
    }
  }
  return prefix
}

function generateEmail() {
  return `${generatePrefix()}@qwecht.com`
}

function generateUsername(first, last) {
  const num = Math.floor(Math.random() * 90) + 10
  return `${first}-${num}-${last}`
}

function generateAccount() {
  const { first, last } = randomName()
  return {
    id: Date.now().toString() + Math.random().toString(36).slice(2),
    email: generateEmail(),
    password: generatePassword(),
    username: generateUsername(first, last),
    firstName: first,
    lastName: last,
    tags: [],
    note: '',
    isFavorite: false,
    registered: false,
    createdAt: new Date().toLocaleString('zh-CN')
  }
}

// ==================== 状态 ====================
let selectedTag = ''
let batchCount = 1
let currentDetailId = null
let currentSeg = 'unregistered' // 'unregistered' | 'registered'

function switchSeg(seg) {
  currentSeg = seg
  document.querySelectorAll('.seg-item').forEach(el => el.classList.remove('active'))
  document.getElementById(`seg-${seg}`).classList.add('active')
  renderList()
}

// ==================== Tab 切换 ====================
function switchTab(tab) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'))
  document.querySelectorAll('.tab-item').forEach(t => t.classList.remove('active'))
  document.getElementById(`page-${tab}`).classList.add('active')
  document.querySelector(`[data-tab="${tab}"]`).classList.add('active')
  
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
  const ddgToken = localStorage.getItem('ddg_token') || ''
  document.getElementById('ddgToken').value = ddgToken
}

// ==================== 列表页 ====================
function renderList() {
  const accounts = getAccounts()

  // 按状态分栏过滤
  const unregistered = accounts.filter(a => !a.registered && !a.sold)
  const registered = accounts.filter(a => a.registered && !a.sold)
  const sold = accounts.filter(a => a.sold === true)

  // 更新分栏数量
  document.getElementById('seg-unregistered').textContent = `未注册 ${unregistered.length}`
  document.getElementById('seg-registered').textContent = `已注册 ${registered.length}`
  document.getElementById('seg-sold').textContent = `号已出 ${sold.length}`

  const segFiltered = currentSeg === 'unregistered' ? unregistered : currentSeg === 'registered' ? registered : sold

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

  const filtered = segFiltered.filter(a =>
    !selectedTag || a.tags.includes(selectedTag)
  )

  const container = document.getElementById('accountList')
  if (filtered.length === 0) {
    container.innerHTML = '<div class="empty">暂无账号</div>'
    return
  }

  container.innerHTML = filtered.map(a => {
    // 底部操作按钮逻辑
    let actionBtn = ''
    if (currentSeg === 'unregistered') {
      actionBtn = `
        <button class="reg-btn" onclick="event.stopPropagation(); setStatus('${a.id}', 'registered')">标记已注册</button>
      `
    } else if (currentSeg === 'registered') {
      actionBtn = `
        <button class="reg-btn" onclick="event.stopPropagation(); setStatus('${a.id}', 'unregistered')">移回未注册</button>
        <button class="sold-btn" onclick="event.stopPropagation(); setStatus('${a.id}', 'sold')">标记号已出</button>
      `
    } else if (currentSeg === 'sold') {
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
            currentSeg === 'unregistered' ? `生成日期 ${a.createdAt}` :
            currentSeg === 'registered' ? `注册日期 ${a.registeredAt || a.createdAt}` :
            `出售日期 ${a.soldAt || a.createdAt}`
          }</span>
          <div style="display:flex;gap:10px;align-items:center">
            ${actionBtn}
            <button class="delete-btn" onclick="event.stopPropagation(); deleteAccount('${a.id}')">删除</button>
          </div>
        </div>
      </div>
    `
  }).join('')
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
  a.registered = status === 'registered'
  a.sold = status === 'sold'
  if (status === 'registered' && !a.registeredAt) a.registeredAt = new Date().toLocaleString('zh-CN')
  if (status === 'sold') a.soldAt = new Date().toLocaleString('zh-CN')
  if (status === 'unregistered') { a.registeredAt = ''; a.soldAt = '' }
  saveAccountList(accounts)
  renderList()
}

// ==================== 生成页 ====================
let previewAccount = null
let currentGenPlatform = 'duck'

function switchGenSeg(platform) {
  currentGenPlatform = platform
  document.querySelectorAll('#gen-seg-github, #gen-seg-duck').forEach(el => el.classList.remove('active'))
  document.getElementById(`gen-seg-${platform}`).classList.add('active')
  refreshPreview()
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
    username: generateUsername(first, last),
    firstName: first,
    lastName: last,
    platform: 'duck',
    tags: [],
    note: '',
    isFavorite: false,
    registered: false,
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
    username: generateUsername(first, last),
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
    const ddgToken = localStorage.getItem('ddg_token') || ''
    const prefix = (document.getElementById('duckPrefix') || {}).value || ''
    previewAccount = generateAccountForDuck(prefix)
    document.getElementById('previewContent').innerHTML = `
      <div class="preview-row">
        <span class="preview-label">邮箱</span>
        <input id="duckPrefix" class="preview-value" placeholder="${ddgToken ? '自动生成中...' : '输入完整邮箱'}" value="${prefix}"
          style="border:none;outline:none;background:transparent;text-align:right;flex:1;width:0;"
          oninput="updateDuckEmail(this.value)" />
      </div>
      <div class="preview-row">
        <span class="preview-label">密码</span>
        <input id="duckPwd" class="preview-value" value="${previewAccount.password}"
          style="border:none;outline:none;background:transparent;text-align:right;"
          oninput="previewAccount.password=this.value" />
      </div>
      <div class="preview-row">
        <span class="preview-label">用户名</span>
        <input id="duckUsername" class="preview-value" value="${previewAccount.username}"
          style="border:none;outline:none;background:transparent;text-align:right;"
          oninput="previewAccount.username=this.value" />
      </div>
    `
    if (ddgToken) fetchDuckAddress(ddgToken)
    return
  }
  previewAccount = generateAccount()
  document.getElementById('previewContent').innerHTML = `
    <div class="preview-row">
      <span class="preview-label">邮箱</span>
      <span class="preview-value">${previewAccount.email}</span>
    </div>
    <div class="preview-row">
      <span class="preview-label">密码</span>
      <span class="preview-value">${previewAccount.password}</span>
    </div>
    <div class="preview-row">
      <span class="preview-label">用户名</span>
      <span class="preview-value">${previewAccount.username}</span>
    </div>
  `
}

function updateDuckEmail(val) {
  if (previewAccount) previewAccount.email = val
}

async function fetchDuckAddress(token) {
  try {
    const res = await fetch('https://quack.duckduckgo.com/api/email/addresses', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
    })
    if (res.ok) {
      const data = await res.json()
      const email = `${data.address}@duck.com`
      const input = document.getElementById('duckPrefix')
      if (input) { input.value = email; updateDuckEmail(email) }
    } else {
      showToast('❌ DDG Token 无效或已过期')
    }
  } catch (e) {
    showToast('❌ 获取 Duck 地址失败')
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
      <input class="info-input" id="detailPwd" value="${a.password}" onblur="savePassword()" />
      <button class="copy-btn" onclick="copyText(document.getElementById('detailPwd').value, '密码')">复制</button>
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
    ${a.registered && a.registeredAt ? `
    <div class="info-row">
      <span class="info-label">注册时间</span>
      <span class="info-value" style="font-family:inherit;font-size:12px">${a.registeredAt}</span>
    </div>` : ''}
    ${a.sold && a.soldAt ? `
    <div class="info-row">
      <span class="info-label">出号时间</span>
      <span class="info-value" style="font-family:inherit;font-size:12px">${a.soldAt}</span>
    </div>` : ''}

    <div class="detail-section">
      <div class="favorite-row">
        <span class="favorite-label">收藏</span>
        <input type="checkbox" ${a.isFavorite ? 'checked' : ''} onchange="updateFavorite(this.checked)" style="width:20px;height:20px;cursor:pointer" />
      </div>
    </div>

    <div class="detail-section">
      <div class="detail-section-title">备注</div>
      <textarea class="detail-textarea" id="noteInput" onblur="saveNote()">${a.note}</textarea>
    </div>

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
        <button onclick="addPresetTag('Kiro')" style="background:#f0f0f0;color:#333;border:none;border-radius:8px;padding:6px 12px;font-size:13px;cursor:pointer;">+ Kiro</button>
        <button onclick="addPresetTag('Trae')" style="background:#f0f0f0;color:#333;border:none;border-radius:8px;padding:6px 12px;font-size:13px;cursor:pointer;">+ Trae</button>
        <input type="text" id="newTagInput" placeholder="输入新标签" maxlength="10" onkeydown="if(event.key==='Enter') addTag()" />
        <button onclick="addTag()">添加</button>
      </div>
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
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => el.classList.add('hidden'), 2000)
}

// ==================== 初始化 ====================
renderList()
initGeneratorPage()

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


let APP_VERSION = 'V1.0.15'
fetch('./version.json').then(r => r.json()).then(d => {
  APP_VERSION = 'V' + d.version
  const el = document.getElementById('appVersion')
  if (el) el.textContent = '当前版本 ' + APP_VERSION
}).catch(() => {})

function forceRefresh() {
  const el = document.getElementById('toast')
  el.textContent = `更新完成，当前版本 ${APP_VERSION}`
  el.classList.remove('hidden')
  if ('serviceWorker' in navigator) {
    caches.keys().then(names => names.forEach(n => caches.delete(n)))
    navigator.serviceWorker.getRegistrations().then(regs => regs.forEach(r => r.unregister()))
  }
  setTimeout(() => { el.classList.add('hidden'); window.location.reload(true) }, 1000)
}
