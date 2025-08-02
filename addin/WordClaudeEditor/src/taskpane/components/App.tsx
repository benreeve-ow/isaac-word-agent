import * as React from "react";
import { useState } from "react";
import {
  makeStyles,
  tokens,
  Tab,
  TabList,
  Button,
  Text,
} from "@fluentui/react-components";
import { EditRegular, SettingsRegular } from "@fluentui/react-icons";
import Header from "./Header";
import EditorTab from "./EditorTab";
import ConfigTab from "./ConfigTab";

interface AppProps {
  title: string;
}

const useStyles = makeStyles({
  root: {
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    backgroundColor: tokens.colorNeutralBackground1,
  },
  content: {
    flex: 1,
    padding: "20px",
    overflowY: "auto",
  },
  tabContent: {
    marginTop: "20px",
  },
});

const App: React.FC<AppProps> = (props: AppProps) => {
  const styles = useStyles();
  const [selectedTab, setSelectedTab] = useState<string>("editor");

  return (
    <div className={styles.root}>
      <Header logo="assets/logo-filled.png" title={props.title} message="AI Writing Assistant" />
      
      <TabList
        selectedValue={selectedTab}
        onTabSelect={(_, data) => setSelectedTab(data.value as string)}
      >
        <Tab value="editor" icon={<EditRegular />}>
          Editor
        </Tab>
        <Tab value="config" icon={<SettingsRegular />}>
          Config
        </Tab>
      </TabList>

      <div className={styles.content}>
        <div className={styles.tabContent}>
          {selectedTab === "editor" && <EditorTab />}
          {selectedTab === "config" && <ConfigTab />}
        </div>
      </div>
    </div>
  );
};

export default App;