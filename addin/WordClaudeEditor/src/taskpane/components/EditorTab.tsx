import * as React from "react";
import { useState } from "react";
import {
  makeStyles,
  tokens,
  Button,
  Text,
  Spinner,
  MessageBar,
  MessageBarBody,
  MessageBarTitle,
  Textarea,
  Field,
  Tag,
} from "@fluentui/react-components";
import { ArrowUploadRegular, LightbulbRegular } from "@fluentui/react-icons";

const useStyles = makeStyles({
  container: {
    display: "flex",
    flexDirection: "column",
    gap: "20px",
  },
  section: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
    padding: "16px",
    backgroundColor: tokens.colorNeutralBackground2,
    borderRadius: tokens.borderRadiusMedium,
  },
  buttonContainer: {
    display: "flex",
    gap: "12px",
    flexWrap: "wrap",
  },
  statusSection: {
    marginTop: "8px",
  },
  selectionInfo: {
    padding: "12px",
    backgroundColor: tokens.colorNeutralBackground3,
    borderRadius: tokens.borderRadiusMedium,
    marginTop: "8px",
  },
  promptField: {
    marginTop: "8px",
  },
  exampleTags: {
    display: "flex",
    gap: "8px",
    flexWrap: "wrap",
    marginTop: "4px",
  },
});

const EditorTab: React.FC = () => {
  const styles = useStyles();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [selectedText, setSelectedText] = useState<string>("");
  const [userPrompt, setUserPrompt] = useState<string>("");

  const examplePrompts = [
    "Turn into bullet points",
    "Make more concise",
    "Expand with more detail",
    "Fix grammar and spelling",
    "Make more formal",
    "Simplify language",
    "Add transitions",
    "Make more persuasive",
  ];

  const handleExampleClick = (example: string) => {
    setUserPrompt(example);
  };

  const handleImproveText = async () => {
    try {
      setIsLoading(true);
      setError(null);
      setSuccess(null);

      if (!userPrompt.trim()) {
        throw new Error("Please enter instructions for how to improve the text");
      }

      await Word.run(async (context) => {
        const selection = context.document.getSelection();
        selection.load("text");
        
        await context.sync();
        
        if (!selection.text || selection.text.trim() === "") {
          throw new Error("Please select some text to improve");
        }

        setSelectedText(selection.text);
        
        // TODO: Call backend API to improve text with user prompt
        // For now, just show success message
        setSuccess(`Processing: "${userPrompt}" on ${selection.text.length} characters. API integration coming soon!`);
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGetSelection = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      await Word.run(async (context) => {
        const selection = context.document.getSelection();
        selection.load("text");
        
        await context.sync();
        
        if (selection.text && selection.text.trim() !== "") {
          setSelectedText(selection.text);
          setSuccess(`Selected ${selection.text.length} characters`);
        } else {
          setError("No text selected");
        }
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to get selection");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.section}>
        <Text size={500} weight="semibold">
          Text Improvement
        </Text>
        <Text size={300}>
          Select text in your document, enter your instructions, and let AI improve it.
        </Text>
        
        <Field 
          label="What would you like to do with the selected text?"
          className={styles.promptField}
          hint="Be specific about how you want the text improved"
        >
          <Textarea
            placeholder="E.g., 'Turn this into bullet points', 'Make it more formal', 'Expand on this idea'..."
            value={userPrompt}
            onChange={(_, data) => setUserPrompt(data.value)}
            rows={3}
            resize="vertical"
          />
        </Field>

        <div>
          <Text size={200} weight="semibold">Quick examples:</Text>
          <div className={styles.exampleTags}>
            {examplePrompts.map((prompt) => (
              <Tag
                key={prompt}
                size="small"
                appearance="brand"
                onClick={() => handleExampleClick(prompt)}
                style={{ cursor: "pointer" }}
                icon={<LightbulbRegular />}
              >
                {prompt}
              </Tag>
            ))}
          </div>
        </div>
        
        <div className={styles.buttonContainer}>
          <Button
            appearance="primary"
            icon={<ArrowUploadRegular />}
            onClick={handleImproveText}
            disabled={isLoading || !userPrompt.trim()}
            size="large"
          >
            {isLoading ? "Processing..." : "Apply Instructions"}
          </Button>
          
          <Button
            appearance="secondary"
            onClick={handleGetSelection}
            disabled={isLoading}
          >
            Check Selection
          </Button>
        </div>

        {isLoading && (
          <div className={styles.statusSection}>
            <Spinner size="small" label="Processing your request..." />
          </div>
        )}

        {error && (
          <MessageBar intent="error" className={styles.statusSection}>
            <MessageBarBody>
              <MessageBarTitle>Error</MessageBarTitle>
              {error}
            </MessageBarBody>
          </MessageBar>
        )}

        {success && (
          <MessageBar intent="success" className={styles.statusSection}>
            <MessageBarBody>
              <MessageBarTitle>Success</MessageBarTitle>
              {success}
            </MessageBarBody>
          </MessageBar>
        )}

        {selectedText && (
          <div className={styles.selectionInfo}>
            <Text size={300} weight="semibold">Current Selection:</Text>
            <Text size={200} block style={{ marginTop: "8px" }}>
              {selectedText.substring(0, 200)}
              {selectedText.length > 200 && "..."}
            </Text>
          </div>
        )}
      </div>

      <div className={styles.section}>
        <Text size={400} weight="semibold">
          How it works
        </Text>
        <Text size={300}>
          1. Select text in your Word document
        </Text>
        <Text size={300}>
          2. Enter your instructions (or click an example)
        </Text>
        <Text size={300}>
          3. Click "Apply Instructions" to process
        </Text>
        <Text size={300}>
          4. Review and accept the AI-generated changes
        </Text>
      </div>
    </div>
  );
};

export default EditorTab;