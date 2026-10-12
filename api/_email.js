







 'use strict';

function html(value) {
	return String(value).replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
}

function emailConfigured() {
	return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
}

async function sendEmail(to, subject, text, htmlContent) {
	if (!emailConfigured() || !to) return false;
	try {
		const response = await fetch('https://api.resend.com/emails', {
			method: 'POST',
			headers: {
				'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({ from: process.env.EMAIL_FROM, to: [to], subject, text, html: htmlContent }),
		});
		if (!response.ok) {
			console.error(`Email delivery failed with status ${response.status}.`);
			return false;
		}
		return true;
	} catch (error) {
		console.error('Email delivery failed:', error.message);
		return false;
	}
}

function requestReceived(user) {
	const name = html(user.full_name);
	return {
		subject: 'Your Den Promise access request was received',
		text: `Hello ${user.full_name}, your access request was received. An administrator will review it and email you when it is approved.`,
		html: `<p>Hello ${name},</p><p>Your access request was received. An administrator will review it and email you when it is approved.</p><p>— Den Promise</p>`,
	};
}

function reviewNotice(user, approved) {
	const name = html(user.full_name);
	const appUrl = process.env.APP_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://127.0.0.1:8000');
	const status = approved ? 'approved' : 'declined';
	return {
		subject: `Your Den Promise access request was ${status}`,
		text: approved
			? `Hello ${user.full_name}, your account has been approved. You can now sign in at ${appUrl}.`
			: `Hello ${user.full_name}, your access request was declined. Contact the administrator if you believe this is an error.`,
		html: approved
			? `<p>Hello ${name},</p><p>Your account has been approved. You can now <a href="${html(appUrl)}">sign in</a>.</p><p>— Den Promise</p>`
			: `<p>Hello ${name},</p><p>Your access request was declined. Contact the administrator if you believe this is an error.</p><p>— Den Promise</p>`,
	};
}

function adminRequestNotice(user) {
	const name = html(user.full_name);
	const email = html(user.email);
	const username = html(user.username);
	return {
		subject: `Access request from ${user.full_name}`,
		text: `A new account is waiting for review. Name: ${user.full_name}. Username: ${user.username}. Email: ${user.email}. Sign in to the admin dashboard to approve or decline it.`,
		html: `<p>A new account is waiting for review.</p><ul><li>Name: ${name}</li><li>Username: ${username}</li><li>Email: ${email}</li></ul><p>Sign in to the admin dashboard to approve or decline it.</p>`,
	};
}

module.exports = { adminRequestNotice, emailConfigured, requestReceived, reviewNotice, sendEmail };

