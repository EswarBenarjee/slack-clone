const nodemailer = require("nodemailer");
const config = require("config");

const sendMailToEmail = async (
  emails,
  title,
  type,
  username,
  usermail,
  inviteLink
) => {
  try {
    let email = "";
    for (i in emails) {
      email += emails[i] + ", ";
    }

    email = email.substring(0, email.length - 2);

    console.log(email);

    const transporter = nodemailer.createTransport({
      host: config.get("SMTP_HOST"),
      port: config.get("SMTP_PORT"),
      requireTLS: true,
      auth: {
        user: "dannie35@ethereal.email",
        pass: "RcYvEXc3ECv7TZKpsg",
      },
    });

    const mailOptions = {
      from: "dannie35@ethereal.email",
      to: email,
      subject: `Invitation Mail for ${title} ${type}`,
      html: `
        <h3>You've been invited to ${title} ${type}</h3>

        <p><span style="font-weight:bold">${username}</span> (${usermail}) has invited you to join their workspace <span style="font-weight:bold">${title}</span></p>

        <p>Joining Link: <a href="${inviteLink}">Click here to join</a></p>

        <h4>What is Slack?</h4>
        
        <p>Slack is a messaging app for teams, a place you can collaborate on projects and organize conversations — so you can work together, no matter where you are.</p>

        <a href="${config.get("PROD_LINK")}">Learn more about Slack -></a>
      `,
    };

    transporter.sendMail(mailOptions, (err, info) => {
      if (err) console.log(err);
      else console.log("Email has been sent:- ", info.response);
    });
  } catch (err) {
    console.log(err.message);
  }
};

const sendMail = async (req, res) => {
  try {
    const { emails, title, type, username, usermail, inviteLink } = req.body;

    await sendMailToEmail(emails, title, type, username, usermail, inviteLink);

    return res.json({ success: true, msg: "Email has been sent" });
  } catch (err) {
    return res.status(400).json({ success: false, msg: err.message });
  }
};

module.exports = sendMail;
