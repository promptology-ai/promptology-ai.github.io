const AI_ENABLED = true;

function OnStartButtonClick()
{
    const StartButton = document.getElementById("start-button");
    StartButton.disabled = true;

    GetTopicFromAI().then(Response => window.location.href = `../chat/index.html?topic=${encodeURIComponent(Response)}`);
}
