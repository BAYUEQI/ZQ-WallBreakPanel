/* eslint-disable no-unused-vars */
localStorage.getItem('darkMode') === 'enabled' && document.body.classList.add('dark-mode');

const form = document.getElementById("configForm");
const [
    selectElements,
    numInputElements,
    inputElements,
    textareaElements,
    checkboxElements
] = [
    'select',
    'input[type=number]',
    'input:not([type=file])',
    'textarea',
    'input[type=checkbox]'
].map(query => form.querySelectorAll(query));

const defaultHttpsPorts = [443, 8443, 2053, 2083, 2087, 2096];
const defaultHttpPorts = [80, 8080, 8880, 2052, 2082, 2086, 2095];

fetch('/panel/settings')
    .then(async response => response.json())
    .then(data => {
        const { success, status, message, body } = data;
        if (status === 401 && !body.isPassSet) {
            const closeBtn = document.querySelector(".close");
            openResetPass();
            closeBtn.style.display = 'none';
        }

        if (!success) throw new Error(`status ${status} - ${message}`);
        const { subPath, proxySettings } = body;
        globalThis.subPath = encodeURIComponent(subPath);
        initiatePanel(proxySettings);
    })
    .catch(error => console.error("数据请求错误:", error.message || error))
    .finally(() => {
        window.onclick = (event) => {
            const qrModal = document.getElementById('qrModal');
            const qrcodeContainer = document.getElementById('qrcode-container');
            if (event.target == qrModal) {
                qrModal.style.display = "none";
                qrcodeContainer.lastElementChild.remove();
            }
        }
    });

function initiatePanel(proxySettings) {
    const {
        VLConfigs,
        TRConfigs,
        ports,
        xrayUdpNoises
    } = proxySettings;

    Object.assign(globalThis, {
        activeProtocols: VLConfigs + TRConfigs,
        activeTlsPorts: ports.filter(port => defaultHttpsPorts.includes(port)),
        xrayNoiseCount: xrayUdpNoises.length,
    });

    populatePanel(proxySettings);
    renderPortsBlock(ports.map(Number));
    renderUdpNoiseBlock(xrayUdpNoises);
    initiateForm();
    fetchIPInfo();
}

function populatePanel(proxySettings) {
    selectElements.forEach(elm => elm.value = proxySettings[elm.id]);
    checkboxElements.forEach(elm => elm.checked = proxySettings[elm.id]);
    inputElements.forEach(elm => elm.value = proxySettings[elm.id]);
    textareaElements.forEach(elm => {
        const key = elm.id;
        const element = document.getElementById(key);
        const value = proxySettings[key]?.join('\r\n');
        const rowsCount = proxySettings[key].length;
        element.style.height = 'auto';
        if (rowsCount) element.rows = rowsCount;
        element.value = value;
    });
}

function initiateForm() {
    const configForm = document.getElementById('configForm');
    globalThis.initialFormData = new FormData(configForm);
    enableApplyButton();

    configForm.addEventListener('input', enableApplyButton);
    configForm.addEventListener('change', enableApplyButton);

    const textareas = document.querySelectorAll("textarea");
    textareas.forEach(textarea => {
        textarea.addEventListener('input', function () {
            this.style.height = 'auto';
            this.style.height = `${this.scrollHeight}px`;
        });
    });
}

function hasFormDataChanged() {
    const configForm = document.getElementById('configForm');
    const formDataToObject = (formData) => Object.fromEntries(formData.entries());
    const currentFormData = new FormData(configForm);
    const initialFormDataObj = formDataToObject(globalThis.initialFormData);
    const currentFormDataObj = formDataToObject(currentFormData);
    return JSON.stringify(initialFormDataObj) !== JSON.stringify(currentFormDataObj);
}

function enableApplyButton() {
    const applyButton = document.getElementById('applyButton');
    const isChanged = hasFormDataChanged();
    applyButton.disabled = !isChanged;
    applyButton.classList.toggle('disabled', !isChanged);
}

function openResetPass() {
    const resetPassModal = document.getElementById('resetPassModal');
    resetPassModal.style.display = "block";
    document.body.style.overflow = "hidden";
}

function closeResetPass() {
    const resetPassModal = document.getElementById('resetPassModal');
    resetPassModal.style.display = "none";
    document.body.style.overflow = "";
}

function closeQR() {
    const qrModal = document.getElementById('qrModal');
    const qrcodeContainer = document.getElementById('qrcode-container');
    qrModal.style.display = "none";
    qrcodeContainer.lastElementChild.remove();
}

function darkModeToggle() {
    const isDarkMode = document.body.classList.toggle('dark-mode');
    localStorage.setItem('darkMode', isDarkMode ? 'enabled' : 'disabled');
}

async function getIpDetails(ip) {
    try {
        const response = await fetch('/panel/my-ip', { method: 'POST', body: ip });
        const data = await response.json();
        const { success, status, message, body } = data;
        if (!success) throw new Error(`status ${status} - ${message}`);
        return body;
    } catch (error) {
        console.error("Fetching IP error:", error.message || error)
    }
}

async function fetchIPInfo() {
    const refreshIcon = document.getElementById("refresh-geo-location").querySelector('i');
    refreshIcon.classList.add('fa-spin');
    const updateUI = (ip = '-', country = '-', countryCode = '-', city = '-', isp = '-', cfIP) => {
        const flag = countryCode !== '-' ? String.fromCodePoint(...[...countryCode].map(c => 0x1F1E6 + c.charCodeAt(0) - 65)) : '';
        document.getElementById(cfIP ? 'cf-ip' : 'ip').textContent = ip;
        document.getElementById(cfIP ? 'cf-country' : 'country').textContent = country + ' ' + flag;
        document.getElementById(cfIP ? 'cf-city' : 'city').textContent = city;
        document.getElementById(cfIP ? 'cf-isp' : 'isp').textContent = isp;
    };

    try {
        const response = await fetch('https://ipwho.is/' + '?nocache=' + Date.now(), { cache: "no-store" });
        const data = await response.json();
        const { success, ip, message } = data;
        if (!success) throw new Error(`获取“其他目标”IP失败 ${response.url} - ${message}`);
        const { country, countryCode, city, isp } = await getIpDetails(ip);
        updateUI(ip, country, countryCode, city, isp);
        refreshIcon.classList.remove('fa-spin');
    } catch (error) {
        console.error("获取 IP 错误:", error.message || error)
    }

    try {
        const response = await fetch('https://ipv4.icanhazip.com/?nocache=' + Date.now(), { cache: "no-store" });
        if (!response.ok) {
            const errorMessage = await response.text();
            throw new Error(`获取 Cloudflare 目标 IP 失败，状态码 ${response.status} ${response.url} - ${errorMessage}`);
        }

        const ip = await response.text();
        const { country, countryCode, city, isp } = await getIpDetails(ip);
        updateUI(ip, country, countryCode, city, isp, true);
        refreshIcon.classList.remove('fa-spin');
    } catch (error) {
        console.error("获取 IP 错误:", error.message || error)
    }
}

function downloadWarpConfigs(isAmnezia) {
    const client = isAmnezia ? "?app=amnezia" : "";
    window.location.href = "/panel/get-warp-configs" + client;
}

function generateSubUrl(path, app, tag, hiddifyType, singboxType) {
    const url = new URL(window.location.href);
    url.pathname = `/sub/${path}/${globalThis.subPath}`;
    app && url.searchParams.append('app', app);
    if (tag) url.hash = `💦 ${atob('V0JQ')} ${tag}`;

    if (singboxType) return `sing-box://import-remote-profile?url=${url.href}`;
    if (hiddifyType) return `hiddify://import/${url.href}`;
    return url.href;
}

function subURL(path, app, tag, hiddifyType, singboxType) {
    const url = generateSubUrl(path, app, tag, hiddifyType, singboxType);
    copyToClipboard(url);
}

async function dlURL(path, app) {
    const url = generateSubUrl(path, app);

    try {
        const response = await fetch(url);
        const data = await response.text();
        if (!response.ok) throw new Error(`状态 ${response.status} ${response.url} - ${data}`);
        downloadJSON(data, "config.json");
    } catch (error) {
        console.error("下载错误:", error.message || error);
    }
}

function downloadJSON(data, fileName) {
    const blob = new Blob([data], { type: 'text/plain' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function exportSettings() {
    const form = validateSettings();
    const data = JSON.stringify(form, null, 4);
    const encodedData = btoa(data);
    downloadJSON(encodedData, `wbp-settings.dat`);
}

function importSettings() {
    const input = document.getElementById('fileInput');
    input.value = '';
    input.click();
}

async function uploadSettings(event) {
    const file = event.target.files[0];
    if (!file) return;

    try {
        const text = await file.text();
        const data = atob(text);
        const settings = JSON.parse(data);
        updateSettings(event, settings);
        initiatePanel(settings);
    } catch (err) {
        console.error('Failed to import settings:', err.message);
    }
}

function openQR(path, app, tag, title, singboxType, hiddifyType) {
    const qrModal = document.getElementById('qrModal');
    const qrcodeContainer = document.getElementById('qrcode-container');
    const url = generateSubUrl(path, app, tag, hiddifyType, singboxType);
    let qrcodeTitle = document.getElementById("qrcodeTitle");
    qrcodeTitle.textContent = title;
    qrModal.style.display = "block";
    let qrcodeDiv = document.createElement("div");
    qrcodeDiv.className = "qrcode";
    qrcodeDiv.style.padding = "2px";
    qrcodeDiv.style.backgroundColor = "#ffffff";
    /* global QRCode */
    new QRCode(qrcodeDiv, {
        text: url,
        width: 256,
        height: 256,
        colorDark: "#000000",
        colorLight: "#ffffff",
        correctLevel: QRCode.CorrectLevel.H
    });
    qrcodeContainer.appendChild(qrcodeDiv);
}

function copyToClipboard(text) {
    navigator.clipboard.writeText(text)
        .then(() => alert('✅ 已复制到剪贴板：\n\n' + text))
        .catch(error => console.error('复制失败:', error));
}

async function updateWarpConfigs() {
    const confirmReset = confirm('⚠️ 确认更新 Warp 账号？');
    if (!confirmReset) return;
    const refreshBtn = document.getElementById('warp-update');
    document.body.style.cursor = 'wait';
    refreshBtn.classList.add('fa-spin');

    try {
        const response = await fetch('/panel/update-warp', { method: 'POST', credentials: 'include' });
        const { success, status, message } = await response.json();
        document.body.style.cursor = 'default';
        refreshBtn.classList.remove('fa-spin');
        if (!success) {
            alert(`⚠️ 发生错误，请重试！\n⛔ ${message}`);
            throw new Error(`status ${status} - ${message}`);
        }

        alert('✅ Warp 配置更新成功！');
    } catch (error) {
        console.error("更新 Warp 配置错误:", error.message || error)
    }
}

function handleProtocolChange(event) {
    if (event.target.checked) {
        globalThis.activeProtocols++;
        return true;
    }

    globalThis.activeProtocols--;
    if (globalThis.activeProtocols === 0) {
        event.preventDefault();
        event.target.checked = !event.target.checked;
        alert("⛔ 至少需要选择一个协议！");
        globalThis.activeProtocols++;
        return false;
    }
}

function handlePortChange(event) {
    const portField = Number(event.target.name);
    if (event.target.checked) {
        globalThis.activeTlsPorts.push(portField);
        return true;
    }

    globalThis.activeTlsPorts = globalThis.activeTlsPorts.filter(port => port !== portField);
    if (globalThis.activeTlsPorts.length === 0) {
        event.preventDefault();
        event.target.checked = !event.target.checked;
        alert("⛔ 至少需要选择一个 TLS 端口！");
        globalThis.activeTlsPorts.push(portField);
        return false;
    }
}

function resetSettings() {
    const confirmReset = confirm('⚠️ 将重置所有面板设置。\n\n❓ 确认继续？');
    if (!confirmReset) return;
    const resetBtn = document.getElementById("refresh-btn");
    resetBtn.classList.add('fa-spin');
    const body = { resetSettings: true };
    document.body.style.cursor = 'wait';

    fetch('/panel/reset-settings', {
        method: 'POST',
        body: JSON.stringify(body),
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' }
    })
        .then(response => response.json())
        .then(data => {
            const { success, status, message, body } = data;
            document.body.style.cursor = 'default';
            resetBtn.classList.remove('fa-spin');
            if (!success) throw new Error(`status ${status} - ${message}`);
            initiatePanel(body);
            alert('✅ 面板设置已恢复默认！');
        })
        .catch(error => console.error("重置设置错误:", error.message || error));
}

function validateSettings() {
    const elementsToCheck = [
        'cleanIPs', 'customCdnAddrs', 'customCdnSni', 'customCdnHost',
        'customBypassRules', 'customBlockRules', 'customBypassSanctionRules'
    ];
    const configForm = document.getElementById('configForm');
    const formData = new FormData(configForm);

    const xrayUdpNoises = [];
    const fields = [
        'udpXrayNoiseMode',
        'udpXrayNoisePacket',
        'udpXrayNoiseDelayMin',
        'udpXrayNoiseDelayMax',
        'udpXrayNoiseCount'
    ].map(field => formData.getAll(field));

    const [modes, packets, delaysMin, delaysMax, counts] = fields;
    modes.forEach((mode, index) => {
        xrayUdpNoises.push({
            type: mode,
            packet: packets[index],
            delay: `${delaysMin[index]}-${delaysMax[index]}`,
            count: counts[index]
        });
    });

    const validations = [
        validateMultipleHostNames(elementsToCheck),
        validateProxyIPs(),
        validateWarpEndpoints(),
        validateMinMax(),
        validateChainProxy(),
        validateCustomCdn(),
        validateXrayNoises(fields),
        validateSanctionDns()
    ];

    if (!validations.every(Boolean)) return false;

    const form = Object.fromEntries(formData.entries());
    form.xrayUdpNoises = xrayUdpNoises;
    const ports = [...defaultHttpPorts, ...defaultHttpsPorts];

    form.ports = ports.reduce((acc, port) => {
        formData.has(port.toString()) && acc.push(port);
        return acc;
    }, []);

    checkboxElements.forEach(elm => {
        form[elm.id] = formData.has(elm.id);
    });

    selectElements.forEach(elm => {
        let value = form[elm.id];
        if (value === 'true') value = true;
        if (value === 'false') value = false;
        form[elm.id] = value;
    });

    numInputElements.forEach(elm => {
        form[elm.id] = Number(form[elm.id]);
    });

    textareaElements.forEach(elm => {
        const key = elm.id;
        const value = form[key];
        form[key] = value === '' ? [] : value.split('\n').map(val => val.trim()).filter(Boolean);
    });

    return form;
}

function updateSettings(event, data) {
    event.preventDefault();
    event.stopPropagation();

    const form = data ? data : validateSettings();
    const applyButton = document.getElementById('applyButton');
    document.body.style.cursor = 'wait';
    const applyButtonVal = applyButton.value;
    applyButton.value = '⌛ 提交中...';

    fetch('/panel/update-settings', {
        method: 'POST',
        body: JSON.stringify(form),
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' }
    })
        .then(response => response.json())
        .then(data => {

            const { success, status, message } = data;
            if (status === 401) {
                alert('⚠️ 会话已过期，请重新登录。');
                window.location.href = '/login';
            }

            if (!success) throw new Error(`status ${status} - ${message}`);
            initiateForm();
            alert('✅ 设置已应用！');
        })
        .catch(error => console.error("更新设置错误:", error.message || error))
        .finally(() => {
            document.body.style.cursor = 'default';
            applyButton.value = applyButtonVal;
        });
}

function validateSanctionDns() {
    const value = document.getElementById("antiSanctionDNS").value.trim();

    let host;
    try {
        const url = new URL(value);
        host = url.hostname;
    } catch {
        host = value;
    }

    const isValid = isValidHostName(host, false);
    if (!isValid) {
        alert('⛔ 无效的 IP 或域名。\n👉 ' + host);
        return false;
    }

    return true;
}

function isValidHostName(value, isHost) {
    const ipv6Regex = /^\[(?:(?:[a-fA-F0-9]{1,4}:){7}[a-fA-F0-9]{1,4}|(?:[a-fA-F0-9]{1,4}:){1,7}:|(?:[a-fA-F0-9]{1,4}:){1,6}:[a-fA-F0-9]{1,4}|(?:[a-fA-F0-9]{1,4}:){1,5}(?::[a-fA-F0-9]{1,4}){1,2}|(?:[a-fA-F0-9]{1,4}:){1,4}(?::[a-fA-F0-9]{1,4}){1,3}|(?:[a-fA-F0-9]{1,4}:){1,3}(?::[a-fA-F0-9]{1,4}){1,4}|(?:[a-fA-F0-9]{1,4}:){1,2}(?::[a-fA-F0-9]{1,4}){1,5}|[a-fA-F0-9]{1,4}:(?::[a-fA-F0-9]{1,4}){1,6}|:(?::[a-fA-F0-9]{1,4}){1,7})\](?:\/(?:12[0-8]|1[01]?\d|[0-9]?\d))?/;
    const ipv4Regex = /^(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)(?:\/(?:\d|[12]\d|3[0-2]))?/;
    const domainRegex = /^(?=.{1,253}$)(?:(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)\.)+[a-zA-Z]{2,63}/;
    const portRegex = /:(?:6553[0-5]|655[0-2]\d|65[0-4]\d{2}|6[0-4]\d{3}|[1-5]?\d{1,4})$/;
    const append = isHost ? portRegex.source : '$';
    const ipv6Reg = new RegExp(ipv6Regex.source + append, 'gm');
    const ipv4Reg = new RegExp(ipv4Regex.source + append, 'gm');
    const domainReg = new RegExp(domainRegex.source + append, 'gm');
    return ipv4Reg.test(value) || ipv6Reg.test(value) || domainReg.test(value);
}

function validateMultipleHostNames(elements) {
    const getValue = (id) => document.getElementById(id).value?.split('\n').filter(Boolean);

    const ips = [];
    elements.forEach(id => ips.push(...getValue(id)));
    const invalidIPs = ips?.filter(value => value && !isValidHostName(value.trim()));

    if (invalidIPs.length) {
        alert('⛔ 无效的 IP 或域名。\n👉 每行输入一个 IP/域名。\n\n' + invalidIPs.map(ip => '⚠️ ' + ip).join('\n'));
        return false;
    }

    return true;
}

function validateProxyIPs() {
    const proxyIPs = document.getElementById('proxyIPs').value?.split('\n').filter(Boolean).map(ip => ip.trim());
    const invalidValues = proxyIPs?.filter(value => !isValidHostName(value) && !isValidHostName(value, true));

    if (invalidValues.length) {
        alert('⛔ 无效的代理 IP。\n👉 每行输入一个 IP/域名。\n\n' + invalidValues.map(ip => '⚠️ ' + ip).join('\n'));
        return false;
    }

    return true;
}

function validateWarpEndpoints() {
    const warpEndpoints = document.getElementById('warpEndpoints').value?.split('\n');
    const invalidEndpoints = warpEndpoints?.filter(value => value && !isValidHostName(value.trim(), true));

    if (invalidEndpoints.length) {
        alert('⛔ 无效的端点。\n\n' + invalidEndpoints.map(endpoint => '⚠️ ' + endpoint).join('\n'));
        return false;
    }

    return true;
}

function validateMinMax() {
    const getValue = (id) => parseInt(document.getElementById(id).value, 10);
    const [
        fragmentLengthMin, fragmentLengthMax,
        fragmentIntervalMin, fragmentIntervalMax,
        noiseCountMin, noiseCountMax,
        noiseSizeMin, noiseSizeMax,
        noiseDelayMin, noiseDelayMax,

    ] = [
        'fragmentLengthMin', 'fragmentLengthMax',
        'fragmentIntervalMin', 'fragmentIntervalMax',
        'noiseCountMin', 'noiseCountMax',
        'noiseSizeMin', 'noiseSizeMax',
        'noiseDelayMin', 'noiseDelayMax'
    ].map(getValue);

    if (fragmentLengthMin >= fragmentLengthMax ||
        fragmentIntervalMin > fragmentIntervalMax ||
        noiseCountMin > noiseCountMax ||
        noiseSizeMin > noiseSizeMax ||
        noiseDelayMin > noiseDelayMax
    ) {
        alert('⛔ 最小值应小于或等于最大值！');
        return false;
    }

    return true;
}

function validateChainProxy() {

    const chainProxy = document.getElementById('outProxy').value?.trim();
    const isVless = /vless:\/\/[^\s@]+@[^\s:]+:[^\s]+/.test(chainProxy);
    const hasSecurity = /security=/.test(chainProxy);
    const isSocksHttp = /^(http|socks):\/\/(?:([^:@]+):([^:@]+)@)?([^:@]+):(\d+)$/.test(chainProxy);
    const securityRegex = /security=(tls|none|reality)/;
    const validSecurityType = securityRegex.test(chainProxy);
    const validTransmission = /type=(tcp|grpc|ws)/.test(chainProxy);

    if (!(isVless && (hasSecurity && validSecurityType || !hasSecurity) && validTransmission) && !isSocksHttp && chainProxy) {
        alert('⛔ 配置不合法！\n - 级联代理支持 VLESS、SOCKS 或 HTTP\n - VLESS 传输需为 GRPC/WS/TCP\n - VLESS 安全为 TLS/Reality/None\n - SOCKS/HTTP 格式：\n + (socks|http)://user:pass@host:port\n + (socks|http)://host:port');
        return false;
    }

    let match = chainProxy.match(securityRegex);
    const securityType = match?.[1] || null;
    match = chainProxy.match(/:(\d+)\?/);
    const vlessPort = match?.[1] || null;

    if (isVless && securityType === 'tls' && vlessPort !== '443') {
        alert('⛔ 作为级联代理时，VLESS 的 TLS 端口必须为 443！');
        return false;
    }

    return true;
}

function validateCustomCdn() {
    const customCdnHost = document.getElementById('customCdnHost').value;
    const customCdnSni = document.getElementById('customCdnSni').value;
    const customCdnAddrs = document.getElementById('customCdnAddrs').value?.split('\n').filter(Boolean);

    const isCustomCdn = customCdnAddrs.length || customCdnHost !== '' || customCdnSni !== '';
    if (isCustomCdn && !(customCdnAddrs.length && customCdnHost && customCdnSni)) {
        alert('⛔ 使用自定义 CDN 时，需同时填写 地址/Host/SNI，或全部清空！');
        return false;
    }

    return true;
}

function validateXrayNoises(fields) {
    const [modes, packets, delaysMin, delaysMax] = fields;
    const base64Regex = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;
    let submisionError = false;

    modes.forEach((mode, index) => {
        if (delaysMin[index] > delaysMax[index]) {
            alert('⛔ 噪声延迟的最小值应小于或等于最大值！');
            submisionError = true;
            return;
        }

        switch (mode) {

            case 'base64': {
                if (!base64Regex.test(packets[index])) {
                    alert('⛔ Base64 噪声数据不是合法的 Base64！');
                    submisionError = true;
                }

                break;
            }
            case 'rand': {
                if (!(/^\d+-\d+$/.test(packets[index]))) {
                    alert('⛔ 随机噪声包应为范围，如 0-10 或 10-30！');
                    submisionError = true;
                }

                const [min, max] = packets[index].split("-").map(Number);
                if (min > max) {
                    alert('⛔ 随机噪声包最小值应小于或等于最大值！');
                    submisionError = true;
                }

                break;
            }
            case 'hex': {
                if (!(/^(?=(?:[0-9A-Fa-f]{2})*$)[0-9A-Fa-f]+$/.test(packets[index]))) {
                    alert('⛔ Hex 噪声数据不是合法的十六进制（长度需为偶数，仅含 0-9 a-f A-F）。');
                    submisionError = true;
                }

                break;
            }
        }
    });

    return !submisionError;
}

function logout(event) {
    event.preventDefault();

    fetch('/logout', { method: 'GET', credentials: 'same-origin' })
        .then(response => response.json())
        .then(data => {
            const { success, status, message } = data;
            if (!success) throw new Error(`status ${status} - ${message}`);
            window.location.href = '/login';
        })
        .catch(error => console.error("Logout error:", error.message || error));
}

document.querySelectorAll(".toggle-password").forEach(toggle => {
    toggle.addEventListener("click", function () {
        const input = this.previousElementSibling;
        const isPassword = input.type === "password";
        input.type = isPassword ? "text" : "password";
        this.classList.toggle('fa-eye');
        this.classList.toggle('fa-eye-slash');
    });
});

function resetPassword(event) {
    event.preventDefault();
    const resetPassModal = document.getElementById('resetPassModal');
    const newPasswordInput = document.getElementById('newPassword');
    const confirmPasswordInput = document.getElementById('confirmPassword');
    const passwordError = document.getElementById('passwordError');
    const newPassword = newPasswordInput.value;
    const confirmPassword = confirmPasswordInput.value;

    if (newPassword !== confirmPassword) {
        passwordError.textContent = "两次输入的密码不一致";
        return false;
    }

    const hasCapitalLetter = /[A-Z]/.test(newPassword);
    const hasNumber = /[0-9]/.test(newPassword);
    const isLongEnough = newPassword.length >= 8;

    if (!(hasCapitalLetter && hasNumber && isLongEnough)) {
        passwordError.textContent = '⚠️ 密码至少包含一个大写字母、一个数字，且长度不少于 8 位。';
        return false;
    }

    fetch('/panel/reset-password', {
        method: 'POST',
        headers: {
            'Content-Type': 'text/plain'
        },
        body: newPassword,
        credentials: 'same-origin'
    })
        .then(response => response.json())
        .then(data => {

            const { success, status, message } = data;
            if (!success) {
                passwordError.textContent = `⚠️ ${message}`;
                throw new Error(`status ${status} - ${message}`);
            }

            alert("✅ 密码修改成功！👍");
            window.location.href = '/login';

        })
        .catch(error => console.error("重置密码错误:", error.message || error))
        .finally(() => {
            resetPassModal.style.display = "none";
            document.body.style.overflow = "";
        });
}

function renderPortsBlock(ports) {
    let noneTlsPortsBlock = '', tlsPortsBlock = '';
    const totalPorts = [
        ...(window.origin.includes('workers.dev') ? defaultHttpPorts : []),
        ...defaultHttpsPorts
    ];

    totalPorts.forEach(port => {
        const isChecked = ports.includes(port) ? 'checked' : '';
        let clss = '', handler = '';
        if (defaultHttpsPorts.includes(port)) {
            clss = 'class="https"';
            handler = 'onclick="handlePortChange(event)"';
        }

        const portBlock = `
            <div class="routing">
                <input type="checkbox" name=${port} ${clss} value="true" ${isChecked} ${handler}>
                <label>${port}</label>
            </div>`;

        defaultHttpsPorts.includes(port)
            ? tlsPortsBlock += portBlock
            : noneTlsPortsBlock += portBlock;
    });

    document.getElementById("tls-ports").innerHTML = tlsPortsBlock;
    if (noneTlsPortsBlock) {
        document.getElementById("non-tls-ports").innerHTML = noneTlsPortsBlock;
        document.getElementById("none-tls").style.display = 'flex';
    }
}

function addUdpNoise(isManual, noiseIndex, udpNoise) {
    const index = noiseIndex ?? globalThis.xrayNoiseCount;
    const noise = udpNoise || {
        type: 'rand',
        packet: '50-100',
        delay: '1-5',
        count: 5
    };

    const container = document.createElement('div');
    container.className = "inner-container";
    container.id = `udp-noise-${index + 1}`;

    container.innerHTML = `
        <div class="header-container">
            <h4>Noise ${index + 1}</h4>
            <button type="button" class="delete-noise">
                <i class="fa fa-minus-circle fa-2x" aria-hidden="true"></i>
            </button>      
        </div>
        <div class="section">
            <div class="form-control">
                <label>😵‍💫 v2ray Mode</label>
                <div>
                    <select name="udpXrayNoiseMode">
                        <option value="base64" ${noise.type === 'base64' ? 'selected' : ''}>Base64</option>
                        <option value="rand" ${noise.type === 'rand' ? 'selected' : ''}>Random</option>
                        <option value="str" ${noise.type === 'str' ? 'selected' : ''}>String</option>
                        <option value="hex" ${noise.type === 'hex' ? 'selected' : ''}>Hex</option>
                    </select>
                </div>
            </div>
            <div class="form-control">
                <label>📥 Noise Packet</label>
                <div>
                    <input type="text" name="udpXrayNoisePacket" value="${noise.packet}">
                </div>
            </div>
            <div class="form-control">
                <label>🕞 Noise Delay</label>
                <div class="min-max">
                    <input type="number" name="udpXrayNoiseDelayMin"
                        value="${noise.delay.split('-')[0]}" min="1" required>
                    <span> - </span>
                    <input type="number" name="udpXrayNoiseDelayMax"
                        value="${noise.delay.split('-')[1]}" min="1" required>
                </div>
            </div>
            <div class="form-control">
                <label>🎚️ Noise Count</label>
                <div>
                    <input type="number" name="udpXrayNoiseCount" value="${noise.count}" min="1" required>
                </div>
            </div>
        </div>`;

    container.querySelector(".delete-noise").addEventListener('click', deleteUdpNoise);
    container.querySelector("select").addEventListener('change', generateUdpNoise);

    document.getElementById("noises").append(container);
    if (isManual) enableApplyButton();
    globalThis.xrayNoiseCount++;
}

function generateUdpNoise(event) {
    const generateRandomBase64 = length => {
        const array = new Uint8Array(Math.ceil(length * 3 / 4));
        crypto.getRandomValues(array);
        let base64 = btoa(String.fromCharCode(...array));
        return base64.slice(0, length);
    }

    const generateRandomHex = length => {
        const array = new Uint8Array(Math.ceil(length / 2));
        crypto.getRandomValues(array);
        let hex = [...array].map(b => b.toString(16).padStart(2, '0')).join('');
        return hex.slice(0, length);
    }

    const generateRandomString = length => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        const array = new Uint8Array(length);
        return Array.from(crypto.getRandomValues(array), x => chars[x % chars.length]).join('');
    };

    const noisePacket = event.target.closest(".inner-container").querySelector('[name="udpXrayNoisePacket"]');

    switch (event.target.value) {
        case 'base64':
            noisePacket.value = generateRandomBase64(64);
            break;

        case 'rand':
            noisePacket.value = "50-100";
            break;

        case 'hex':
            noisePacket.value = generateRandomHex(64);
            break;

        case 'str':
            noisePacket.value = generateRandomString(64);
            break;
    }
}

function deleteUdpNoise(event) {
    if (globalThis.xrayNoiseCount === 1) {
        alert('⛔ 不能删除所有噪声！');
        return;
    }

    const confirmReset = confirm('⚠️ 将删除该噪声。\n\n❓ 确认继续？');
    if (!confirmReset) return;
    event.target.closest(".inner-container").remove();
    enableApplyButton();
    globalThis.xrayNoiseCount--;
}

function renderUdpNoiseBlock(xrayUdpNoises) {
    document.getElementById("noises").innerHTML = '';
    xrayUdpNoises.forEach((noise, index) => {
        addUdpNoise(false, index, noise);
    });
    globalThis.xrayNoiseCount = xrayUdpNoises.length;
}