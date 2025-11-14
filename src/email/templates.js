export const APP_URL = "https://play.google.com/store/apps/details?id=com.f2sit.dailyjoke&utm_source=newsletter&utm_medium=email&utm_campaign=daily_joke_newsletter";

export const emailTemplates = [
	{
		subject: "🌞 Bom dia! Chegou sua gargalhada matinal 😄",
		html: ({ currentJoke, jokeUrl, unsubscribeLink, appUrl = APP_URL }) => `
  <html><body style="background:#fff7da; font-family:'Segoe UI', sans-serif; padding:32px;">
    <div style="max-width:600px; margin:auto; background:white; border-radius:16px; padding:28px; border:1px solid #ffe08a;">

      <h1 style="text-align:center; color:#e39400;">🌞 Acordou? Então toma um sorriso!</h1>

      <p style="color:#444; font-size:1rem;">
        Porque o Brasil já tem problemas demais, aqui vai sua dose diária de alegria pra começar bem o dia:
      </p>

      <div style="background:#fff0c2; padding:18px; margin:20px 0; border-left:6px solid #e39400; font-size:1.3rem;">
        ${currentJoke.text.replace(/\n/g, "<br>")}
      </div>

      <p style="text-align:center;">
        Curtiu? Avalie essa pérola no nosso
        <a href="${jokeUrl}" style="color:#e39400; font-weight:bold;">site</a>.
      </p>

      <p style="font-size:0.85rem; text-align:center; color:#777; margin-top:30px;">
        Quer parar de receber? Tudo bem, mas o Brasil vai ficar mais triste:
        <a href="${unsubscribeLink}" style="color:#555;">Cancelar assinatura</a>
      </p>

    </div>
  </body></html>`
	},
	{
		subject: "😂 Chegou o meme do dia (versão texto!)",
		html: ({ currentJoke, jokeUrl, unsubscribeLink, appUrl = APP_URL }) => `
  <html><body style="background:#f2f2f2; font-family:'Arial', sans-serif; padding:32px;">
    <div style="max-width:620px; margin:auto; background:white; border-radius:14px; padding:30px;">

      <h1 style="text-align:center; color:#222;">🔥 Mais quente que meme no Twitter</h1>

      <p style="color:#555; text-align:center;">
        Aqui está o momento exato em que você quase derruba o celular de tanto rir:
      </p>

      <blockquote style="margin:25px 0; padding:20px; border-left:6px solid #ff2d55; background:#fff5f7; font-size:1.35rem; color:#333;">
        ${currentJoke.text.replace(/\n/g, "<br>")}
      </blockquote>

      <p style="text-align:center;">
        Valeu a risada?
        <a href="${jokeUrl}" style="color:#ff2d55; font-weight:bold;">Avalie aqui</a>.
      </p>

      <p style="text-align:center; margin-top:25px; font-size:0.8rem; color:#777;">
        Não quer mais esse tipo de entretenimento saudável?
        <a href="${unsubscribeLink}" style="color:#555;">Cancelar</a>.
      </p>

    </div>
  </body></html>`
	},
	{
		subject: "🍻 Chegou a piada que desce redondo",
		html: ({ currentJoke, jokeUrl, unsubscribeLink, appUrl = APP_URL }) => `
  <html><body style="background:#fff3e6; font-family:'Tahoma', sans-serif; padding:36px;">
    <div style="max-width:620px; margin:auto; background:white; border-radius:16px; padding:28px; border:1px solid #f4c59c;">

      <h2 style="text-align:center; color:#d67b27;">🍻 Bem-vindo ao Boteco do Humor</h2>

      <p style="color:#6b4e2e;">
        Senta aí, pega uma água com gás (ou algo mais forte) e aprecia essa piadinha:
      </p>

      <div style="margin:20px 0; padding:20px; background:#ffe9d6; border-left:6px solid #d67b27; font-size:1.35rem; color:#4a341f;">
        ${currentJoke.text.replace(/\n/g, "<br>")}
      </div>

      <p style="text-align:center;">
        Gostou, meu consagrado?
        <a href="${jokeUrl}" style="color:#d67b27; font-weight:bold;">Avaliar piada</a>
      </p>

      <p style="text-align:center; margin-top:22px; font-size:0.8rem; color:#9e8261;">
        Sem clima pra humor hoje?
        <a href="${unsubscribeLink}" style="color:#6e573e;">Cancelar</a>.
      </p>

    </div>
  </body></html>`
	},
	{
		subject: "🗞️ Vazou! Sua piada exclusiva do dia 😱",
		html: ({ currentJoke, jokeUrl, unsubscribeLink, appUrl = APP_URL }) => `
  <html><body style="background:#f7f0ff; padding:36px; font-family:'Helvetica', sans-serif;">
    <div style="max-width:600px; margin:auto; background:white; border-radius:18px; padding:30px; border:2px solid #eedcff;">

      <h1 style="text-align:center; color:#845ec2;">🗞️ Manchete de Hoje: Risadas!</h1>

      <p style="text-align:center; color:#555;">
        Fontes confirmam que você está prestes a dar um sorriso:
      </p>

      <blockquote style="margin:25px 0; padding:20px; background:#f4eaff; border-left:6px solid #845ec2; font-size:1.35rem; color:#37275a;">
        ${currentJoke.text.replace(/\n/g, "<br>")}
      </blockquote>

      <p style="text-align:center;">
        Reaja à fofoca no nosso
        <a href="${jokeUrl}" style="color:#845ec2; font-weight:bold;">site</a>.
      </p>

      <p style="text-align:center; font-size:0.8rem; margin-top:28px; color:#777;">
        Cansou dos babados engraçados?
        <a href="${unsubscribeLink}" style="color:#555;">Cancelar envio</a>
      </p>

    </div>
  </body></html>`
	},
	{
		subject: "💛 Um sorriso fresquinho só pra você!",
		html: ({ currentJoke, jokeUrl, unsubscribeLink, appUrl = APP_URL }) => `
  <html><body style="background:#fffdf3; padding:36px; font-family:'Verdana', sans-serif;">
    <div style="max-width:580px; margin:auto; background:white; border-radius:20px; padding:30px; border:1px solid #f5eec2;">

      <h2 style="color:#c29b00; text-align:center;">💛 Dose de Alegria do Dia</h2>

      <p style="text-align:center; color:#666;">
        Que tal um sorriso antes de continuar seu dia?
      </p>

      <div style="margin:25px 0; padding:20px; background:#fff8dc; border-left:6px solid #c29b00; font-size:1.3rem; color:#4a3a00;">
        ${currentJoke.text.replace(/\n/g, "<br>")}
      </div>

      <p style="text-align:center;">
        Amor à primeira risada?
        <a href="${jokeUrl}" style="color:#c29b00; font-weight:bold;">Avalie a piada</a>.
      </p>

      <p style="text-align:center; margin-top:25px; font-size:0.85rem; color:#999;">
        Não quer mais receber carinho humorístico?
        <a href="${unsubscribeLink}" style="color:#666;">Cancelar</a>.
      </p>

    </div>
  </body></html>`
	}


];
