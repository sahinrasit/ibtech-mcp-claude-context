# IBTech MCP Server Kurulum Rehberi

## 🚀 Hızlı Başlangıç

### 1. Projeyi Build Edin
```bash
pnpm build
```

### 2. MCP İstemcisi Konfigürasyonu

#### Cursor için:
`~/.cursor/mcp.json` dosyasına şu konfigürasyonu ekleyin:

```json
{
  "mcpServers": {
    "ibtech-mcp-claude-context": {
      "command": "node",
      "args": ["/Users/rasitsahin/mcp/dist/index.js"],
      "env": {
        "MCP_SERVER_NAME": "IBTech MCP Server",
        "MCP_SERVER_VERSION": "1.0.0",
        "EMBEDDING_PROVIDER": "OpenAI",
        "EMBEDDING_MODEL": "text-embedding-3-small",
        "OPENAI_API_KEY": "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",
        "OPENAI_BASE_URL": "https://api.openai.com/v1",
        "MILVUS_ADDRESS": "https://in03-f69fdb078f68f9c.serverless.aws-eu-central-1.cloud.zilliz.com",
        "MILVUS_TOKEN": "3acc3c2026012977e341cce136336fd6d4643abd97c7523aafc0141c5fbef8a7ba21a89138aa16977e84d2ca9e8d83cca55ec2df",
        "REPOS_BASE_PATH": "/Users/rasitsahin/mcp/repos",
        "DEFAULT_PROJECT": "mobilebanking",
        "DEFAULT_BRANCH": "prod"
      }
    }
  }
}
```

#### Claude Desktop için:
`~/Library/Application Support/Claude/claude_desktop_config.json` dosyasına yukarıdaki konfigürasyonu ekleyin.

#### Gemini CLI için:
`~/.gemini/settings.json` dosyasına yukarıdaki konfigürasyonu ekleyin.

## 🛠️ Mevcut Araçlar

### 1. `index_project`
Proje indeksleme:
```json
{
  "projectName": "mobilebanking",
  "branch": "prod"
}
```

### 2. `list_projects`
Mevcut projeleri listele:
```json
{}
```

### 3. `list_branches`
Proje dallarını listele:
```json
{
  "projectName": "mobilebanking"
}
```

### 4. `list_components`
Proje bileşenlerini listele:
```json
{
  "projectName": "mobilebanking",
  "branch": "prod"
}
```

### 5. `search_code`
İndekslenen projelerde arama:
```json
{
  "path": "/Users/rasitsahin/mcp/repos/mobilebanking/prod",
  "query": "authentication logic"
}
```

## 📁 Proje Yapısı

```
repos/
├── mobilebanking/
│   ├── prod/
│   │   ├── fbIos/
│   │   ├── fbAndroid/
│   │   └── fbBackend/
│   ├── preprod/
│   └── test/
└── corebanking/
    ├── prod/
    ├── preprod/
    └── test/
```

## 🔧 Ortam Değişkenleri

- `REPOS_BASE_PATH`: Repos klasörünün yolu (varsayılan: `./repos`)
- `DEFAULT_PROJECT`: Varsayılan proje adı (varsayılan: `mobilebanking`)
- `DEFAULT_BRANCH`: Varsayılan dal adı (varsayılan: `prod`)
- `EMBEDDING_PROVIDER`: Embedding sağlayıcısı (varsayılan: `OpenAI`)
- `EMBEDDING_MODEL`: Embedding modeli (varsayılan: `text-embedding-3-small`)

## 🧪 Test

```bash
# MCP sunucusunu test et
pnpm test:mcp

# Geliştirme modunda çalıştır
pnpm dev

# Build et
pnpm build
```

## 📝 Kullanım Örnekleri

1. **Proje İndeksleme**: "mobilebanking prod projesini indeksle"
2. **Proje Listesi**: "mevcut projeleri listele"
3. **Arama**: "mobilebanking projesinde authentication kodunu bul"
4. **Dal Listesi**: "mobilebanking projesinin dallarını göster"
