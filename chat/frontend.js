const AI_ENABLED = true;
const WaitingText = "Ждем... Генерация ответа от ИИ";

const GradientBackground = [
    { Pos: 0,   Color: "#4a1c1c" },
    { Pos: 50,  Color: "#4a3b1c" },
    { Pos: 100, Color: "#1c4a2a" }
];

const GradientBorder = [
    { Pos: 0,   Color: "#ff5f5f" },
    { Pos: 50,  Color: "#ffbd5f" },
    { Pos: 100, Color: "#5fff8d" }
];

let Topic = "Магнитная Индукция";

document.addEventListener("DOMContentLoaded", () =>
{
    const URLTopic = new URLSearchParams(window.location.search).get('topic');
    if(URLTopic) Topic = URLTopic;

    document.getElementById("title").textContent = Topic;

    const LocalID = AddMessage(false, WaitingText, "");
    GetStartMessageFromAI(Topic).then(Response => GetMessage(LocalID).querySelector('span').innerText = Response);
});

function OnSendButtonClick()
{
    const UserInput = document.getElementById("user-input");
    const SendButton = document.getElementById("user-send");
    const UserPrompt = UserInput.value.trim();

    if(UserPrompt === "") return;

    UserInput.disabled = true;
    SendButton.disabled = true;

    UserInput.value = "";
    const UserMessageID = AddMessage(true, UserPrompt);

    try
    {
        // Небольшая "динамичность" - отправлять ответ от ИИ на 350мс позднее
        // А также заменять текст по приходу ответа от ИИ
        let LocalID = 0;
        const Timer = setTimeout(() => LocalID = AddMessage(false, WaitingText), 350); //Надеюсь я не обосрал весь код, но вот тута, если что для дебага 10% поставил
        SendUserPromptToAI(Topic, UserPrompt).then(async Response =>
        {
            clearTimeout(Timer);

            if(LocalID === 0) AddMessage(false, Response.Advice, "");
            else GetMessage(LocalID).querySelector('span').innerText = Response.Advice;

            const Message = GetMessage(UserMessageID);
            Message.insertAdjacentHTML('afterbegin', `<span class="percent">0%</span>`);
            const MessageSpans = Message.querySelectorAll('span');

            for(let i = 0; i <= Response.Score; i += 1)
            {
                MessageSpans.forEach(MessageSpan =>
                {
                    const MessageStyle = MessageSpan.style;
                    MessageStyle.setProperty('--result-bg'    , GetColorFromGradient(GradientBackground, i));
                    MessageStyle.setProperty('--result-border', GetColorFromGradient(GradientBorder    , i));
                });

                Message.querySelector('.percent').textContent = `${i}%`;
                await new Promise(r => setTimeout(r, 8));
            }
        });
    }
    finally
    {
        UserInput.disabled = false;
        SendButton.disabled = false;
        UserInput.focus();
    }
}

let MessageCounter = 0;
function AddMessage(bIsUser, InText)
{
    const ChatContainer = document.getElementById('chat-container');
    ++MessageCounter;

    ChatContainer.insertAdjacentHTML('beforeend',
        `
        <div id="message-${MessageCounter}" class="message-${bIsUser ? "user" : "ai"}">
            <span class="message">${InText}</span>
        </div>
    `);
    ChatContainer.scrollTop = ChatContainer.scrollHeight;

    return MessageCounter;
}

function GetMessage(InID)
{
    return document.getElementById(`message-${InID}`);
}

function GetColorFromGradient(InGradient, InPercent)
{
    const t = Math.max(0, Math.min(100, InPercent));

    let i = 1;
    for(; i < InGradient.length - 1; i++)
        if(t < InGradient[i].Pos)
            break;

    const start = InGradient[i - 1];
    const end = InGradient[i];

    const range = end.Pos - start.Pos;
    const rangeT = range === 0 ? 0 : (t - start.Pos) / range;

    const parse = (hex) => {
        const h = hex.replace('#', '');
        return [
            parseInt(h.substring(0, 2), 16),
            parseInt(h.substring(2, 4), 16),
            parseInt(h.substring(4, 6), 16)
        ];
    };

    const rgb1 = parse(start.Color);
    const rgb2 = parse(end.Color);

    const result = [0, 1, 2].map(idx =>
    {
        const val = Math.round(rgb1[idx] + (rgb2[idx] - rgb1[idx]) * rangeT);
        return val.toString(16).padStart(2, '0');
    });

    return `#${result.join('')}`;
}
