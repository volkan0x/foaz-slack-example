import { useEffect, useState } from 'react'
import './App.css'
import { Alert, AppBar, Avatar, Box, Button, Card, CircularProgress, CssBaseline, IconButton, Paper, Snackbar, TextField, Typography } from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import useSlack from './useSlack';
import { MeetingRoom } from '@mui/icons-material';

function App() {
  const [user, setUser] = useState('');
  const [message, setMessage] = useState('');
  const [sendError, setSendError] = useState('');
  const { slackUser, setSlackUser, messages, send, loading, sending } = useSlack();
  const afterSend = ({ status, json }) => {
    setMessage('');
    if (status !== 200) {
      setSendError(json?.detail || 'Error sending message');
    }
  }

  useEffect(() => {
    if (slackUser) {
      send(`User ${slackUser} just logged in to the app 🎉`).then(afterSend);
    }
  }, [slackUser]);

  return (
    <>
      {sendError && <Snackbar open={!!sendError} onClose={() => setSendError('')}>
        <Alert severity="error" onClose={() => setSendError('')} sx={{ width: '100%' }}>
          {sendError}
        </Alert>
      </Snackbar>}
      <CssBaseline />
      <Paper sx={{ p: 1, mt: '-100%' }}>
        {slackUser && (
          <>
            App User: {slackUser} {<Button onClick={() => { setSlackUser(''); setUser(''); }}>Logout</Button>}
          </>
        )}
        {!slackUser && (
          <>
            <Typography variant='h5' sx={{ pb: 1 }}>Login</Typography>
            <TextField
              label="User"
              value={user}
              onChange={(e) => setUser(e.target.value)}
              InputProps={{
                endAdornment: (
                  <IconButton onClick={() => (setSlackUser(user))} disabled={!user} color='primary'>
                    <MeetingRoom />
                  </IconButton>
                )
              }}
            />
          </>
        )}
      </Paper>
      <Paper sx={{ position: 'fixed', bottom: 16, right: 16, overflow: 'hidden', height: '50%', width: '20%', minWidth: 300, display: 'flex', flexDirection: 'column' }}>
        <AppBar position="static" >
          <Typography align='left' sx={{ p: 2 }}>Support Chat</Typography>
        </AppBar>
        <Box sx={{ flex: 1, overflow: 'scroll', display: 'flex', flexDirection: 'column-reverse', gap: 1.5, p: 1.5 }}>
          {!slackUser && <Typography alignSelf='center' align='center' variant='h5'>Login to start chatting</Typography>}
          {slackUser && !messages && !loading && <Typography align='center' variant='body1'>No messages yet</Typography>}
          {slackUser && messages && messages.map(({ bot, text, user, avatar }, i) => (
            <Box sx={{ display: 'flex', alignSelf: bot ? 'end' : 'start', flexDirection: bot ? 'row-reverse' : 'row', gap: 1 }}>
              <Avatar sx={{ bgcolor: 'primary.main' }} src={avatar} />
              <Card key={i} sx={{ maxWidth: '70%', px: 1 }}>
                <Typography align='left' variant='body2' color="text.secondary">{user}</Typography>
                <Typography align='left' variant='body1'>{text}</Typography>
              </Card>
            </Box>
          ))}
          {loading && <CircularProgress sx={{ alignSelf: 'center' }} />}
        </Box>
        <Box sx={{ p: 1 }} component="form" onSubmit={(e) => { e.preventDefault(); send(message).then(afterSend); }}>
          <TextField
            fullWidth
            variant="outlined"
            label="Message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            disabled={!slackUser}
            InputProps={{
              endAdornment: (
                <IconButton disabled={!message} type='submit'>
                  {!sending && <SendIcon />}
                  {sending && <CircularProgress />}
                </IconButton>
              )
            }}
          />
        </Box>
      </Paper>
    </>
  )
}

export default App
