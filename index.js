const express = require('express');
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.post('/webhook/amo', async (req, res) => {
  const leadData = req.body;

  // Извлекаем нужные поля из payload amoCRM
  const leadId = leadData?.leads?.add?.[0]?.id;
  const leadName = leadData?.leads?.add?.[0]?.name;

  if (!leadId) return res.sendStatus(400);

  // Отправляем в Claude
  const claudeResponse = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      messages: [{
        role: 'user',
        content: `Новый лид: "${leadName}". Напиши краткий план работы с клиентом.`
      }]
    })
  });

  const claudeData = await claudeResponse.json();
  const aiText = claudeData.content[0].text;

  // Записываем результат как примечание в amoCRM
  await addNoteToLead(leadId, aiText);

  res.sendStatus(200);
});

async function addNoteToLead(leadId, text) {
  await fetch(`https://YOURDOMAIN.amocrm.ru/api/v4/leads/${leadId}/notes`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.AMO_ACCESS_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify([{
      note_type: 'common',
      params: { text }
    }])
  });
}

app.listen(3000);
