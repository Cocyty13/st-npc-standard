import { getContext } from '../../../extensions.js';
import { SlashCommandParser } from '../../../slash-commands/SlashCommandParser.js';
import { SlashCommand } from '../../../slash-commands/SlashCommand.js';
import { SlashCommandArgument, ARGUMENT_TYPE } from '../../../slash-commands/SlashCommandArgument.js';
import { world_info } from '../../../world-info.js';
import { saveSettingsDebounced, generateRaw } from '../../../../script.js';
import { callGenericPopup, POPUP_TYPE } from '../../../popup.js';
import { render, books, extractJson, SYSTEM, MAIN_BOOK, MARK } from './template.js';

const TAG = 'NPC Standard';
let original = null; // auto-profile's /npc command object (keeps its image + group add)
let running = false;

function suppressAutoInjection() {
    // auto-profile injects a per-generation instruction asking the model to emit <!--NPC_PROFILE--> HTML; that makes
    // non-standard cards and costs tokens every round. Cards are created only through /npc.
    try { getContext().setExtensionPrompt('auto_profile_new_characters', '', 1, 0, false, 0); } catch { /* ignore */ }
}

async function post(url, body) {
    const r = await fetch(url, { method: 'POST', headers: getContext().getRequestHeaders(), body: JSON.stringify(body) });
    if (!r.ok) throw new Error(`${url} ${r.status}`);
    return r.headers.get('content-type')?.includes('json') ? r.json() : r.text();
}

async function standardize(avatar, input) {
    const ctx = getContext();
    const ch = ctx.characters.find(c => c.avatar === avatar);
    if (!ch) throw new Error('new card not found');
    const raw = await generateRaw({ systemPrompt: SYSTEM, prompt: `INPUT (player's words, the only canon):\nname: ${ch.name.split(' — ')[0]}\n${input}`, responseLength: 900, trimNames: false });
    const j = extractJson(raw);
    const r = render(ch.name, j, input, ch.data?.extensions?.is_minor ?? null);
    let text = await callGenericPopup(`ตรวจ/แก้การ์ด ${r.th} (${r.youth ? 'เยาวชน — ไม่มีเนื้อหารัก/เพศ, ไม่ผูกหนังสือผู้ใหญ่' : 'ผู้ใหญ่'}) · ยกเลิก = เก็บการ์ดเดิมไว้แต่ปิดเสียงไว้`, POPUP_TYPE.INPUT, r.text, { rows: 22, wide: true, large: true, okButton: 'บันทึก', cancelButton: 'ยกเลิก' });
    const youth = r.youth;
    if (typeof text !== 'string' || !text.trim()) {
        // cancelled: keep the auto card, but still make it safe
        text = null;
    } else if (youth && !text.startsWith(MARK)) text = MARK + '\n' + text.replace(new RegExp('^' + MARK + '\\n?'), '');
    const data = { extensions: { world: MAIN_BOOK, is_minor: youth, npc_standard: text ? 1 : 0 } };
    if (text) Object.assign(data, { description: text, personality: '', scenario: '', mes_example: '', first_mes: '' });
    else if (youth && !String(ch.data?.description || '').startsWith(MARK)) data.description = MARK + '\n' + ch.data.description;
    const top = {}; for (const k of ['description', 'personality', 'scenario', 'mes_example', 'first_mes']) if (k in data) top[k] = data[k];
    await post('/api/characters/merge-attributes', { avatar, ...top, data });
    // extra books exactly like existing members: youth -> event log only; adult -> event log + adult books
    const key = avatar.replace(/\.[^.]+$/, '');
    world_info.charLore = (world_info.charLore || []).filter(x => x.name !== key);
    world_info.charLore.push({ name: key, extraBooks: books(youth) });
    saveSettingsDebounced();
    await ctx.getCharacters();
    // muted by default: user unmutes to bring the character into the scene
    if (ctx.groupId) await ctx.executeSlashCommandsWithOptions(`/member-disable "${ch.name}"`, { handleExecutionErrors: true });
    toastr.success(`${r.th}: การ์ดมาตรฐาน${text ? '' : ' (ยกเลิก — คงการ์ดเดิม)'} · ${youth ? 'เยาวชน' : 'ผู้ใหญ่'} · ปิดเสียงไว้ในกลุ่ม${r.flagged.length ? ' · ตัดช่องที่ไม่เหมาะกับเยาวชน: ' + r.flagged.join(',') : ''}`, TAG, { timeOut: 12000 });
}

async function npc(args, value) {
    if (running) { toastr.info('กำลังสร้างการ์ดก่อนหน้า', TAG); return ''; }
    if (!original) { toastr.error('ไม่พบ Auto Profile (/npc เดิม)', TAG); return ''; }
    const input = String(value || '').trim();
    if (!input) return original.callback(args, value);
    running = true;
    try {
        const ctx = getContext(); const before = new Set(ctx.characters.map(c => c.avatar));
        await original.callback(args, value);
        await ctx.getCharacters();
        const added = getContext().characters.filter(c => !before.has(c.avatar));
        if (!added.length) { toastr.info('ไม่มีการ์ดใหม่ (อาจมีชื่อนี้อยู่แล้ว) — ไม่ได้แก้อะไร', TAG); return ''; }
        await standardize(added[added.length - 1].avatar, input.replace(/^"[^"]*"\s*|^\S+\s*/, ''));
    } catch (e) { toastr.error(e.message, TAG); } finally { running = false; }
    return '';
}

function install() {
    const cmds = SlashCommandParser.commands;
    if (cmds.npc && cmds.npc.callback !== npc) original = cmds.npc;
    SlashCommandParser.addCommandObject(SlashCommand.fromProps({
        name: 'npc', aliases: ['newnpc'], callback: npc,
        helpString: 'สร้างตัวละครใหม่ตามแม่แบบการ์ดมาตรฐาน (ปิดเสียงในกลุ่มไว้ก่อน) เช่น /npc ต้น อายุ 30 ผู้ชาย เป็นบาริสต้าร้านกาแฟ',
        unnamedArgumentList: [SlashCommandArgument.fromProps({ description: 'ชื่อ ตามด้วยรายละเอียด', typeList: [ARGUMENT_TYPE.STRING], isRequired: false })],
    }));
    const btn = document.getElementById('auto_profile_manual');
    if (btn && !btn.dataset.npcStd) {
        btn.dataset.npcStd = '1';
        btn.onclick = async () => {
            const n = document.getElementById('auto_profile_name')?.value || '';
            const age = document.getElementById('auto_profile_age')?.value || '';
            const d = document.getElementById('auto_profile_appearance')?.value || '';
            await npc({}, `"${n}" ${age !== '' ? 'อายุ ' + age + ' ' : ''}${d}`);
        };
    }
}

jQuery(() => {
    const ctx = getContext();
    install(); suppressAutoInjection();
    ctx.eventSource.on(ctx.eventTypes.APP_READY, () => { install(); suppressAutoInjection(); });
    ctx.eventSource.on(ctx.eventTypes.CHAT_CHANGED, () => setTimeout(suppressAutoInjection, 0));
    ctx.eventSource.on(ctx.eventTypes.GENERATION_STARTED, suppressAutoInjection);
});
