import * as React from "react";
import { makeStyles, Text } from "@fluentui/react-components";

const useStyles = makeStyles({
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0 12px",
    height: "36px",
    backgroundColor: "#1a1a1a",
    color: "#ffffff",
  },
  title: {
    fontSize: "13px",
    fontWeight: "600",
    letterSpacing: "0.5px",
  },
  version: {
    fontSize: "11px",
    color: "#808080",
  },
});

const Header: React.FC = () => {
  const styles = useStyles();
  
  return (
    <header className={styles.header}>
      <Text className={styles.title}>DNAgent</Text>
      <Text className={styles.version}>v1.0</Text>
    </header>
  );
};

export default Header;