// Pure helpers (no SillyTavern imports) so they can be unit-tested in node.
// ---- CONFIG: edit these to match your own lorebook names ----
export const MARK = '------ youth ------';
export const MAIN_BOOK = 'คฤหาสน์มรดก — 01 จักรวาล';
export const LOG_BOOK = 'คฤหาสน์มรดก — บันทึกเหตุการณ์';
export const ADULT_BOOKS = ['lorebook_main_th_v2', 'lorebook_rules_th', 'ปมผู้ใหญ่'];
const YOUTH_BAN = /\b(bust|breasts?|cleavage|waist|hips?|curv\w*|sexy|seductive|sexual|sex|romance|romantic|lover|boyfriend|girlfriend|crush|kiss\w*|dating|flirt\w*|aroused?)\b|นม|หน้าอก|อกอึ๋ม|เอว|สะโพก|เซ็กซี่|เซ็กส์|แฟน|คนรัก|จูบ|ชู้|เดท|รอบอก|\d{2,3}\s*\/\s*\d{2,3}\s*\/\s*\d{2,3}/i;
export function detectYouth(input, json = {}, pluginMinor = null) {
    const t = String(input || '');
    const ageM = t.match(/อายุ\s*(\d{1,3})/);
    const age = ageM ? Number(ageM[1]) : (Number.isFinite(json.age) ? json.age : null);
    return Boolean(json.youth) || pluginMinor === true || /(?:^|[^ก-๙])(?:ป|ม)\.\s?[1-6]|ประถม|มัธยม|นักเรียน|นักศึกษา|มหาลัย|มหาวิทยาลัย|อนุบาล|\bstudent\b|\bschool\b/i.test(t) || (age !== null && age < 18);
}
export function gradeFrom(input, json = {}) {
    const m = String(input || '').match(/(?:ป|ม)\.\s?[1-6]/);
    return m ? m[0].replace(/\s/g, '') : (json.grade || null);
}
const one = s => String(s ?? '').replace(/\s*\n+\s*/g, ' ').trim();
const val = s => one(s) || 'Not yet specified.';
const dot = s => { s = val(s); return /[.!?)"”]$/.test(s) ? s : s + '.'; };
export function youthClean(fields) {
    const flagged = [];
    for (const k of ['role', 'appearance', 'personality', 'speech', 'relationships', 'notes']) {
        if (YOUTH_BAN.test(fields[k] || '')) { flagged.push(k); fields[k] = 'Not yet specified.'; }
    }
    fields.examples = (fields.examples || []).filter(x => !YOUTH_BAN.test(x));
    fields.secrets = '';
    return flagged;
}
export function render(name, j, input, pluginMinor = null) {
    const th = name.split(' — ')[0].trim();
    const youth = detectYouth(input, j, pluginMinor);
    const f = { ...j }; const flagged = youth ? youthClean(f) : [];
    const grade = gradeFrom(input, j);
    const uni = /นักศึกษา|มหาลัย|มหาวิทยาลัย|university|college/i.test(String(input) + ' ' + (j.role || ''));
    const age = Number.isFinite(j.age) ? j.age : (String(input).match(/อายุ\s*(\d{1,3})/) ? Number(String(input).match(/อายุ\s*(\d{1,3})/)[1]) : null);
    const g = { male: 'male (ผู้ชาย); refer to him as he/him', female: youth ? 'female (เด็กสาว)' : 'female (ผู้หญิง); refer to her as she/her' }[String(j.gender || '').toLowerCase()] || 'not specified (ask the player)';
    let ageLine;
    if (youth && !(uni && age !== null && age >= 18)) ageLine = `Grade: ${grade || 'school grade not yet specified'} (minor)`;
    else if (youth) ageLine = `Age: ${age} (adult), university student`;
    else ageLine = `Age: ${age !== null ? age + ' (adult)' : 'adult (exact age not specified)'}`;
    const ex = (f.examples || []).map(one).filter(Boolean).slice(0, 2).map(x => `"${x.replace(/^"|"$/g, '')}"`).join(' / ');
    let speech = val(f.speech).replace(/[.]$/, '');
    speech += ex ? `. e.g. ${ex}` : '';
    speech = dot(speech);
    if (youth) speech = speech.replace(/([^.])$/, '$1.') + (uni ? ' Talks naturally for their age, not like a little child.' : ' Talks naturally for their grade, not like a little child.');
    const rom = one(j.romanisation);
    const L = [];
    if (youth) L.push(MARK);
    L.push('<{{char}}>');
    L.push(`[Name] ${th}${rom ? ` (${rom}; always written ${th})` : ` (always written ${th})`}`);
    L.push(ageLine, `Gender: ${g}.`, `Role: ${dot(f.role)}`, `Appearance: ${dot(f.appearance)}`, `Personality: ${dot(f.personality)}`, `Speech: ${speech}`, `Relationships: ${dot(f.relationships)}`);
    if (!youth) L.push(`Secrets: ${dot(one(f.secrets) || 'None known yet')}`);
    let notes = one(f.notes).replace(/\s*Reply in natural Thai\.?$/i, '');
    if (youth) notes = (notes ? dot(notes) + ' ' : '') + 'No romantic or sexual content of any kind.';
    L.push(`Notes: ${notes ? dot(notes) + ' ' : ''}Reply in natural Thai.`, '</{{char}}>');
    return { text: L.join('\n'), youth, flagged, th };
}
export function books(youth) { return youth ? [LOG_BOOK] : [LOG_BOOK, ...ADULT_BOOKS]; }
export function extractJson(s) {
    s = String(s || ''); const a = s.indexOf('{'), b = s.lastIndexOf('}');
    if (a < 0 || b <= a) throw new Error('model did not return JSON');
    return JSON.parse(s.slice(a, b + 1));
}
export const SYSTEM = `You turn the player's description of a NEW character into JSON for a Thai roleplay character card. Output JSON only, no prose:
{"name_th":"","romanisation":"","youth":false,"grade":null,"age":null,"gender":"male|female|unknown","role":"","appearance":"","personality":"","speech":"","examples":["",""],"relationships":"","secrets":"","notes":""}
Rules:
- Use ONLY facts in INPUT. Never invent canon: no new relationships, history, secrets, job, age, grade or traits. Unknown field = "Not yet specified." The ONLY things you may fill in when missing are ordinary appearance details, a plain speaking register matching the stated facts, and 1-2 short neutral everyday Thai example lines.
- Concise English, one short line per field. Keep Thai for names, pronouns, particles, kinship terms, place names and example lines.
- romanisation: one simple romanisation of the Thai name.
- youth=true if under 18, any school grade (ป./ม.), or any student. For youth, give grade (e.g. "ม.2") instead of age; appearance only height, build, hair, gait, age-appropriate clothes; NO bust/waist/hip figures, no body-sexualising words; no romance or sexual content anywhere; secrets "".
- Adults: appearance in one line with approximate height, rough chest/waist/hip figures and build consistent with the facts.
- gender only if stated or clearly implied (pronoun, kinship word like แม่/พ่อ/ลูกสาว/ลูกชาย, particle ค่ะ/ครับ); otherwise "unknown".
- speech: Thai self-pronoun(s) and particle(s) for this character (ครับ for male, ค่ะ for female when known).
- Never add sexual content that INPUT does not contain. If INPUT (adult characters only) contains adult facts, keep their meaning briefly in secrets, no new detail.`;
