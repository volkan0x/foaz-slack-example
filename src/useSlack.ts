import { useCallback, useEffect, useState } from "react";
import jose from "node-jose";

const SUPPORT_CHANNEL = import.meta.env.VITE_SLACK_CHANNEL_ID,
    PROXY_ID = import.meta.env.VITE_PERMIT_PROXY_ID;

// Use local keys.json file to generate JWT
const generateJWT = async (user: string) => {

    const JWKeys = await fetch('/keys.json').then((res) => res.text());
    const keyStore = await jose.JWK.asKeyStore(JWKeys.toString());
    const [key] = keyStore.all({ use: "sig" });
    const opt = { compact: true, jwk: key, fields: { typ: "jwt" } };

    const payload = JSON.stringify({
        exp: Math.floor((Date.now() + 60000000) / 1000),
        iat: Math.floor(Date.now() / 1000),
        sub: user,
        iss: "https://www.permit.io"
    });

    return await jose.JWS.createSign(opt, key).update(payload).final();
};

// A special fetch function that use FoAz proxy to make a request
const proxyFetch = async (url: string, user: string, method: string, body: any) => {
    const token = await generateJWT(user);
    const res = await fetch(`https://proxy.api.permit.io/proxy/${PROXY_ID}?url=${url}`, {
        method,
        body: body ? JSON.stringify(body) : undefined,
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    });
    const json = await res.json();
    const status = res.status;
    return { status, json };
}

export default function useSlack() {
    const [slackUser, setSlackUser] = useState('');
    const [messages, setMessages] = useState<any>();
    const [members, setMembers] = useState<any>();
    const [loading, setLoading] = useState(false);
    const [sending, setSending] = useState(false);

    const fetchMembers = useCallback(async () => {
        if (!slackUser) return;
        const { json: u } = await proxyFetch(`https://slack.com/api/users.list`, slackUser, 'GET', undefined);
        if (!u?.members?.length) {
            return;
        }
        const m = u.members.reduce((acc, member) => ({
            [member.id]: member,
            ...acc
        }), {});
        setMembers(m);
    }, [slackUser]);

    const fetchMessages = useCallback(async () => {
        if (!slackUser || sending || loading) return;

        setLoading(true);

        if (!members) {
            await fetchMembers();
            setLoading(false);
            return;
        }

        const { json: messages } = await proxyFetch(`https://slack.com/api/conversations.history`, slackUser, 'POST', {
            channel: SUPPORT_CHANNEL,
        });
        if (!messages?.messages?.length) {
            setLoading(false);
            return;
        }

        setMessages(messages.messages.map((message: any) => ({
            ...message,
            user: members[message.user]?.real_name,
            avatar: members[message.user]?.profile?.image_72,
            bot: members[message.user]?.is_bot,
        })));
        setLoading(false);
    }, [slackUser, members, fetchMembers, sending, loading]);

    const send = useCallback(async (message: string) => {
        setSending(true);
        const messageRes = await proxyFetch(`https://slack.com/api/chat.postMessage`, slackUser, 'POST', {
            channel: SUPPORT_CHANNEL,
            text: message,
        });
        setSending(false);
        fetchMessages();
        return messageRes;
    }, [slackUser, fetchMessages]);

    // Fetch messages on slack user changes and every 10 seconds
    // Also including an edgecase for fetching messages right after fetching members
    useEffect(() => {
        if (!slackUser) {
            setMessages(undefined);
            return;
        }

        fetchMessages();

        const intervalId = setInterval(() => {
            fetchMessages();
        }, 1000 * 10) // in milliseconds
        return () => clearInterval(intervalId)
    }, [slackUser, members]);


    return {
        slackUser,
        setSlackUser,
        messages,
        send,
        loading,
        sending,
    };
}