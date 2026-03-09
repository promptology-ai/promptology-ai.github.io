const ScoreToWin = 95;

async function SendMessageToAPI(InMessageText)
{
    const Temperature = 0.3;

    if(!AI_ENABLED)
    {
        await new Promise(r => setTimeout(r, 1000));
        return "Просто placeholder-ответ от ИИ (AI_ENABLED отключен)";
    }

    try
    {
        const Response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers:
                {
                    "Authorization": `Bearer ${API_KEY}`,
                    "Content-Type": "application/json",
                    "HTTP-Referer": "https://promptology-ai.github.io",
                    "X-Title": "Promptology"
                },
            body: JSON.stringify({
                model: "meta-llama/llama-3.2-3b-instruct:free", // "google/gemma-3n-e2b-it:free",
                temperature: Temperature,
                max_tokens: 150,
                messages: [{ role: "user", content: InMessageText }]
            })
        });

        /*
        const Response = await fetch("http://localhost:8080/v1/chat/completions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                temperature: Temperature,
                max_tokens: 200,
                messages: [{ role: "user", content: InMessageText }]
            })
        });
        */

        const Data = await Response.json();
        console.log(Data);

        if(!Data.error) return Data.choices[0].message.content;

        console.error("API Error!");
    }
    catch(Error) { console.error("Fetch Error: ", Error); }

    return "Ошибка получения ответа от ИИ (открой консоль)";
}

async function SendUserPromptToAI(InTopic, InUserPrompt)
{
    const Analyze = AnalyzePrompt(InTopic, InUserPrompt);

    const Prompt =Analyze.Score >= ScoreToWin ?
        `
        Ты — дружелюбный помощник в игре "Promptology". Игрок достиг ${ScoreToWin}+ баллов.

        ФАКТЫ:
        - Баллы игрока: ${Analyze.Score}/100
        - В его промпте есть: ${Analyze.Exists.join(', ')}
        
        Напиши 3-4 предложения, обращаясь к игроку на "ты":
        - Поздравь с победой в игре
        - Скажи, что его промпт получился отличным (теперь ИИ поймет его правильно)
        - Объясни, почему он хорош (ИИ поймёт всё правильно)
        
        Тон: радостный, как друг, который по-настоящему рад за тебя.
        
        ЗАПРЕЩЕНО: списки, нумерация, "Вот ответ:", "1. 2. 3.", "я", "мне", "мои", "мы", "наши", "давайте"
        НУЖНО: связный текст, как в разговоре, "ты", "твой", "тебе", "поздравляю", "молодец"
        `
    :
        `
        Ты говоришь с ИГРОКОМ напрямую. Ты — его помощник, не он сам.
        
        ФАКТЫ О ПРОМПТЕ ИГРОКА:
        - Баллы: ${Analyze.Score}/100
        - Есть: ${Analyze.Exists.join(', ')}
        - Не хватает: ${Analyze.Missing.join(', ')}
        
        ЗАЧЕМ НУЖНО:
        - Роль → ИИ поймёт стиль (учитель просто, учёный точно)
        - Аудитория → ИИ подберёт слова под возраст
        - Формат → ИИ структурирует ответ (список/текст)
        - Ограничения → ИИ не уйдёт в сложное
        
        Напиши 3 предложения, обращаясь к игроку на "ты":
        "У тебя X баллов... Тебе не хватает... Добавь... потому что..."
        
        ЗАПРЕЩЕНО: списки, нумерация, "Вот ответ:", "1. 2. 3.", "я", "мне", "мои", "мы", "наши", "давайте"
        НУЖНО: связный текст, как в разговоре, "ты", "тебе", "твои", "добавь", "попробуй"
        `;

    console.log(Prompt);
    const Result = await SendMessageToAPI(Prompt, false);
    return { Score: Analyze.Score, Advice: Result };
}

async function GetTopicFromAI()
{
    const Prompt =
    `
    Ты — судейский движок игры "Promptology". 
    Твоя задача — напиши название любой темы связанная ТОЛЬКО с темами из школьных предметов. (Физики, Математики, Химии, Истории, Обществознания и тд.)
    
    ВЫДАЙ СТРОГО: Только название темы.
    КРИТЕРИИ: Короткое сообщение, без упоминаний ЭТАЛОННОГО промпта.
    ЗАПРЕЩЕНО: Эмодзи, Markdown-разметку, приветствия, обращения к игроку, "Тема"
    `.trim();

    return (await SendMessageToAPI(Prompt))
        .toLowerCase()
        .replaceAll("." , "")
        .replaceAll(":" , "")
        .replaceAll("\"", "")
        .replaceAll("тема", "")
        .trim()
        .replace(/^./, str => str.toUpperCase());
}

async function GetStartMessageFromAI(InTopic)
{
    const StartPrompt =
    `
    Ты — помощник в игре "Promptology". Игрок учится писать промпты для ИИ.
    
    Напиши приветствие игроку на тему "${InTopic}".
    
    Требования:
    - Обратись на "ты"
    - Упомяни тему "${InTopic}"
    - Скажи, что нужно писать подробные промпты
    - 2-3 предложения
    - Без списков, без эмодзи
    
    Пример хорошего ответа:
    "Привет! Сегодня разберём магнитную индукцию. Попробуй написать промпт так, чтобы ИИ понял, кто объясняет и для кого."
    
    Твой ответ:`;

    return await SendMessageToAPI(StartPrompt);
}

function AnalyzePrompt(InTopic, InUserPrompt)
{
    const Checks =
    {
        bHasRole: /(ты|вы|в роли|как|представь).{0,30}(учитель|физик|ученый|эксперт|программист|математик|химик)/i.test(InUserPrompt),
        bHasTopic: InUserPrompt.toLowerCase().includes(InTopic.toLowerCase()),
        bHasAudience: /(для|школьник|ученик|студент|новичок|детей)/i.test(InUserPrompt),
        bHasFormat: /(список|таблица|кратко|подробно|шаги|пункт|абзац|текст)/i.test(InUserPrompt),
        bHasConstraints: /(без|не используй|только|исключи|без формул)/i.test(InUserPrompt)
    };

    const Score = Object.values(Checks).filter(Boolean).length * 19;
    const Missing = [];
    const Exists = [];

    (Checks.bHasRole        ? Exists : Missing).push("роль");
    (Checks.bHasTopic       ? Exists : Missing).push("чёткое указание темы");
    (Checks.bHasAudience    ? Exists : Missing).push("аудитория (для кого объясняешь)");
    (Checks.bHasFormat      ? Exists : Missing).push("формат ответа");
    (Checks.bHasConstraints ? Exists : Missing).push("ограничения");

    const Result =
    {
        Score: Math.min(Score + 2, 100),
        Checks: Checks,
        Exists: Exists,
        Missing: Missing,
    };

    console.log(Result);

    return Result;
}

// Чит-код:
// Ты опытный учитель объясни магнитная индукция для список без формул.
