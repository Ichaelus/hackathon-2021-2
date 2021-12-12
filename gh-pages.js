const ghpages = require('gh-pages');

ghpages.publish(
  'public',
  {
    branch: 'gh-pages',
    repo: 'https://github.com/Ichaelus/hackathon-2021-2.git',
    user: {
        name: 'Ichaelus',
        email: 'Ichaelus@users.noreply.github.com'
    }
  },
  () => {
    console.log('Deploy Complete!')
  }
)
