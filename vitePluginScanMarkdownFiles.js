import path from "path"
import fs from "fs"
import MarkdownIt from "markdown-it"
import meta from "markdown-it-meta"
import emoji from "markdown-it-emoji"
import externalLinks from "markdown-it-external-links"
import { v4 as uuidv4 } from 'uuid';

const md = new MarkdownIt({
    html: true,
    xhtmlOut: true,
    linkify: true,
    typographer: true
});

md.use(meta)
    .use(emoji)
    .use(externalLinks, {
        externalTarget: "_blank"
    })

const source = "."

class FileTree {
    constructor (filePath, name = null) {
        this.path = filePath.slice(source.length + 1, filePath.length)
        this.link = filePath
        this.text = name
        this.children = []
        this.markdownContent = null
        this.htmlContent = null
        this.meta = {
            uuid : uuidv4()
        }
    }
}

const allFiles = []

const readDir = function (filePath) {
    const fileArray = []

    const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' })

    fs.readdirSync(filePath).sort(collator.compare).forEach(file => {
        if (!['.vuepress', '.git', 'node_modules', 'compiiile', 'bin', '.idea', '.DS_Store', '.gitignore'].includes(file)) {
            const fileInfo = new FileTree(`${filePath}/${file}`, file)

            const stat = fs.statSync(fileInfo.link)

            if (stat.isDirectory()) {
                delete fileInfo.path
                fileInfo.children = readDir(fileInfo.link)
            }

            if (path.extname(file) === '.md' || (stat.isDirectory() && fileInfo.children.length > 0)) {
                fileArray.push(fileInfo)

                if (!stat.isDirectory()) {
                    fileInfo.markdownContent = fs.readFileSync(fileInfo.link, {encoding:'utf8'})
                    fileInfo.htmlContent = md.render(fileInfo.markdownContent)

                    fileInfo.meta = {... fileInfo.meta, ...md.meta }
                    allFiles.push(fileInfo)
                }
            }
        }
    })
    return fileArray
}

export default function scanMarkdownFiles() {
    const virtualModuleId = '~ahah'
    const resolvedVirtualModuleId = '\0' + virtualModuleId

    return {
        name: 'scan-markdown-files',
        resolveId(id) {
            if (id === virtualModuleId) {
                return resolvedVirtualModuleId
            }
        },
        load(id) {
            if (id !== resolvedVirtualModuleId) {
                return
            }

            const filesTree = readDir(source)

            return `const pages = ${JSON.stringify(allFiles)};\n\n
            export default pages;`
        }
    }
}
