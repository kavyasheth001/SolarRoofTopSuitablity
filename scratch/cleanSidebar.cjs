const fs = require('fs');
let code = fs.readFileSync('src/components/Sidebar/index.jsx', 'utf8');

// Remove User Info section (lines containing `user && (() => {` to `})()}`)
const userCodeRegex = /\{user && \(\(\) => \{[\s\S]*?\}\)\(\)\}/g;
code = code.replace(userCodeRegex, '');

// Remove Mobile Close Button as it was right after user info, wait, let's keep the mobile close button.
// Instead, let's look for `<h3 className="mb-5 px-4 text-sm font-bold uppercase tracking-wider" style={{ color: secondaryColor }}>\n              MENU\n            </h3>` and cut everything until `</nav>`.

const menuRegex = /<h3[^>]*>\s*MENU\s*<\/h3>[\s\S]*?(?=<\/div>\s*<\/nav>)/g;
code = code.replace(menuRegex, '');

// Make sure we have </div></nav>
fs.writeFileSync('src/components/Sidebar/index.jsx', code);
