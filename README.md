# Conometro ⏱

Sistema web de **cronômetro** (stopwatch) e **temporizador** (countdown) com layout moderno e interativo, feito em HTML, CSS e JavaScript puro — sem dependências ou build step.

## Funcionalidades

**Cronômetro**
- Iniciar, pausar, continuar e zerar
- Marcação de voltas com tempo parcial e total
- Destaque automático da melhor e pior volta
- Anel de progresso animado (uma volta completa por minuto)

**Temporizador**
- Definição de horas/minutos/segundos ou atalhos rápidos (1, 5, 10, 15, 30 min)
- Botão "+1 min" mesmo com o contador em andamento
- Anel de progresso regressivo, com aviso visual nos últimos 10 segundos
- Alarme sonoro (sintetizado via Web Audio, sem arquivos externos), notificação do navegador e efeito visual ao finalizar

**Geral**
- Tema claro/escuro com preferência salva no navegador
- Atalhos de teclado: `Espaço` (iniciar/pausar), `L` (marcar volta), `R` (zerar)
- Visual com glassmorphism, gradientes animados e totalmente responsivo

## Como usar

Basta abrir `index.html` em um navegador, ou servir a pasta com qualquer servidor estático:

```bash
python3 -m http.server 8080
```

## Estrutura

```
index.html      Estrutura da página
css/style.css   Estilos e tema
js/script.js    Lógica do cronômetro, temporizador e interações
```
