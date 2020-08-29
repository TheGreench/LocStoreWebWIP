const urlParams = new URLSearchParams(window.location.search)
const accountId = urlParams.get("id")
document.getElementById("accountId").textContent = accountId
let lastStatementDate = new Date(0)

let ecoMode = !!+(localStorage.getItem("ecoMode") ?? "1")
document.body.dataset.style = localStorage.getItem("style") ?? "clair"
document.getElementById("lowDataCheck").checked = ecoMode
Array.from(document.getElementsByName("radioStyle")).find(radio => radio.value === document.body.dataset.style)?.click()

const transactionTypes = {
        0: "VTXTLR",
        1: "DEBIT",
        2: "CREDIT",
        3: "SYSTLR",
}
const currencyType = {
        "fragment": "Gem Fragment",
        "ruby": "Ruby",
        "elixir": "Elixir",
        "crystal": "Crystal",
}

async function tryReplaceDiscordIds(desc) {
        const promises = [];
        desc.replace(/[^:]\d+/g, match => {
                const promise = fetchData(match.substring(1))
                        .then(data => `${match[0]}${data.user}:${match.substring(1)}`)
                        .catch(err => match)

                promises.push(promise)
        });
        const data = await Promise.allSettled(promises)
        return desc.replace(/[^:]\d+/g, () => data.shift().value)
}

function fetchData(accountId) {
        return fetch(`https://commshop.libraryofcode.org/account/bank?account=${accountId}`)
                .then(res => res.json())
                .then(json => {if (json.code !== 10000) {throw new Error(json.message)} return json.message})
}

function updateData(accountId = accountId, firstFetch = false) {
        fetchData(accountId)
                .then(msg => {
                        if (firstFetch) {
                                document.getElementById("name").textContent = msg.user
                        }
                        Array.from(document.getElementById("bankList").children)
                                .filter(span => span.hasAttribute("name"))
                                .forEach(span => span.textContent = msg[span.getAttribute("name")]?.toFixed(2) || (0).toFixed(2))

                        const dateFormat = new Intl.DateTimeFormat(undefined, {year: "numeric", month: "numeric", day: "numeric", hour: "numeric", minute: "numeric", second: "numeric"})
                        let lastDate = lastStatementDate
                        const table = document.getElementById("statement")
                        const template = document.getElementById("templateStatementRow")
                        const elements = msg.transactions
                                .filter(trans => new Date(trans.date) > lastStatementDate)
                                .map(async trans => {
                                        if (new Date(trans.date) > lastDate) {lastDate = new Date(trans.date)}

                                        const row = document.importNode(template.content, true).firstElementChild
                                        const spanList = row.children

                                        spanList.type.textContent = transactionTypes[trans.type]
                                        spanList.date.textContent = dateFormat.format(new Date(trans.date))
                                        spanList.description.textContent = ecoMode ? trans.name : await tryReplaceDiscordIds(trans.name)
                                        spanList.currency.textContent = currencyType[trans.currencyType]

                                        spanList.balance.textContent = trans.balance
                                        row.classList.add(trans.balance < 0 ? "negative" : "positive")

                                        return row
                                })
                        Promise.all(elements)
                                .then(elList => elList.forEach(el => table.appendChild(el)))

                        lastStatementDate = lastDate
                })
                .catch(err => console.error(err))
}

updateData(accountId, true)
setInterval(()=>updateData(accountId), 60000)

document.getElementById("lowDataCheck").onclick = async e => {
        ecoMode = e.target.checked
        localStorage.setItem("ecoMode", ecoMode ? "1" : "0")

        if (!ecoMode) {
                const table = document.getElementById("statement")
                table.innerHTML = await tryReplaceDiscordIds(table.innerHTML)
        }
}
Array.from(document.getElementsByName("radioStyle"))
        .forEach(radio => radio.onclick = () => {
                document.body.dataset.style = radio.value
                localStorage.setItem("style", radio.value)
        })